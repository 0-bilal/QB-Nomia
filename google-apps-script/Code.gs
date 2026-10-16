/**
 * QB-Nomia — Google Apps Script (خادم المزامنة المشفّرة مع Google Sheets)
 * ========================================================================
 *
 * هذا السكربت لا يخزّن أي بيانات مالية مقروءة إطلاقًا — التطبيق يشفّر كل
 * بياناته محليًا (AES-GCM) قبل ما يرسلها، والسكربت يخزّن فقط النص المشفّر
 * الناتج كما هو، ويرجّعه كما هو عند الطلب. فك التشفير يصير فقط داخل
 * التطبيق نفسه بنفس الرمز السري — جوجل شيت (وأي شخص يشوفه) يرى نصًا
 * عشوائيًا غير مفهوم فقط.
 *
 * التركيب (الأسهل من داخل التطبيق: المزيد ← المزامنة ← «إعداد خطوة بخطوة»،
 * يعطيك هذا الكود جاهزًا وفيه رمزك):
 *   1. افتح script.google.com/create (أو من أي جدول: Extensions ← Apps Script).
 *   2. احذف كل محتوى Code.gs الافتراضي، والصق محتوى هذا الملف كاملًا.
 *   3. غيّر قيمة SECRET_TOKEN بالأسفل لنص عشوائي طويل — نفس الرمز اللي تدخله
 *      بإعدادات التطبيق، لأنه مفتاح التشفير ورمز الدخول في نفس الوقت.
 *   4. اختر الدالة setup ثم ▶ Run ووافق على الصلاحيات — تنشئ جدول
 *      "QB-Nomia Backup" (لو السكربت مو مربوط بجدول) وورقة sync_data.
 *   5. Deploy ← New deployment ← Web app:
 *        - Execute as: Me
 *        - Who has access: Anyone
 *      انسخ الرابط المنتهي بـ /exec وألصقه بإعدادات التطبيق (مو بالكود —
 *      المستودع عام، فأي رابط/رمز بالكود يصير مرئي للجميع).
 *   6. أي تعديل لاحق على هذا الكود يحتاج Deploy ← Manage deployments
 *      ← ✎ تعديل ← Version: New version ← Deploy.
 */

// نفس الرمز السري المحفوظ بإعدادات التطبيق (المزيد ← المزامنة)
var SECRET_TOKEN = 'CHANGE-ME-TO-A-LONG-RANDOM-SECRET'

var SHEET_NAME = 'sync_data'
var ROW_KEY = 'snapshot'
// Google Sheets يرفض أي خلية فوق 50,000 حرف — النص المشفّر يُقسَّم على عدة صفوف
// (snapshot، snapshot#1، snapshot#2 ...) بحد أقصى أقل من الحد الرسمي بهامش أمان.
var CHUNK_SIZE = 45000

/** شغّلها يدويًا مرة واحدة فقط من محرر Apps Script: تنشئ الجدول (لو ما فيه) وورقة التخزين. */
function setup() {
  var ss = getSpreadsheet()
  getSheet()

  var def = ss.getSheetByName('Sheet1')
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def)

  Logger.log('جاهز — جدول التخزين المشفّر: ' + ss.getUrl())
}

/**
 * الجدول المرتبط بالسكربت (لو فُتح من Extensions ← Apps Script)، وإلا جدول
 * مستقل يُنشأ أول مرة باسم "QB-Nomia Backup" ويُحفظ معرّفه في خصائص السكربت.
 * بهذا يشتغل السكربت سواء أُنشئ من داخل جدول أو مباشرة من script.google.com.
 */
function getSpreadsheet() {
  var active = SpreadsheetApp.getActiveSpreadsheet()
  if (active) return active
  var props = PropertiesService.getScriptProperties()
  var id = props.getProperty('SHEET_ID')
  if (id) return SpreadsheetApp.openById(id)
  var ss = SpreadsheetApp.create('QB-Nomia Backup')
  props.setProperty('SHEET_ID', ss.getId())
  return ss
}

function doGet(e) {
  try {
    checkToken(e.parameter.token)
    if (e.parameter.action === 'pull') {
      return jsonResponse({ ok: true, data: readValue() })
    }
    return jsonResponse({ ok: false, error: 'إجراء غير معروف: ' + e.parameter.action })
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) })
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents)
    checkToken(body.token)

    if (body.action === 'push') {
      writeValue(body.data)
      return jsonResponse({ ok: true })
    }
    return jsonResponse({ ok: false, error: 'إجراء غير معروف: ' + body.action })
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) })
  }
}

function checkToken(token) {
  if (!SECRET_TOKEN || SECRET_TOKEN === 'CHANGE-ME-TO-A-LONG-RANDOM-SECRET') {
    throw new Error('لازم تغيّر SECRET_TOKEN بالكود قبل الاستخدام')
  }
  if (token !== SECRET_TOKEN) {
    throw new Error('رمز الدخول غير صحيح')
  }
}

function getSheet() {
  var ss = getSpreadsheet()
  var sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME)
    sheet.getRange(1, 1, 1, 3).setValues([['key', 'encrypted_value', 'updated_at']])
    sheet.setFrozenRows(1)
  }
  return sheet
}

/** مفتاح الجزء رقم i — الجزء الأول يبقى "snapshot" عشان يتوافق مع البيانات المخزّنة قبل التقسيم. */
function chunkKey(i) {
  return i === 0 ? ROW_KEY : ROW_KEY + '#' + i
}

function readValue() {
  var sheet = getSheet()
  var values = sheet.getDataRange().getValues()
  var chunks = {}
  for (var i = 1; i < values.length; i++) chunks[values[i][0]] = values[i][1]

  var result = ''
  for (var n = 0; chunks[chunkKey(n)] !== undefined; n++) result += String(chunks[chunkKey(n)])
  return result // فارغ لو ما فيه بيانات محفوظة بعد (أول مرة قبل أي رفع)
}

function writeValue(encryptedValue) {
  var lock = LockService.getScriptLock()
  lock.waitLock(20000)
  try {
    var sheet = getSheet()
    // نص صريح — بعض الأجزاء قد تبدأ بـ "+" أو أرقام، فما نبي جوجل شيت يحاول يفسّرها كرقم أو معادلة
    sheet.getRange('B:B').setNumberFormat('@')
    var value = String(encryptedValue)
    var count = Math.max(1, Math.ceil(value.length / CHUNK_SIZE))
    var now = new Date()

    var values = sheet.getDataRange().getValues()
    var rowOf = {}
    for (var i = 1; i < values.length; i++) rowOf[values[i][0]] = i + 1

    for (var n = 0; n < count; n++) {
      var part = value.substr(n * CHUNK_SIZE, CHUNK_SIZE)
      var key = chunkKey(n)
      if (rowOf[key]) sheet.getRange(rowOf[key], 2, 1, 2).setValues([[part, now]])
      else sheet.appendRow([key, part, now])
    }

    // حذف أجزاء زائدة من رفعة سابقة أكبر — من الأسفل للأعلى عشان أرقام الصفوف ما تتزحزح
    var stale = []
    for (var m = count; rowOf[chunkKey(m)]; m++) stale.push(rowOf[chunkKey(m)])
    stale.sort(function (a, b) { return b - a }).forEach(function (row) { sheet.deleteRow(row) })
  } finally {
    lock.releaseLock()
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}
