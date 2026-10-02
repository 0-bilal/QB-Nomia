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
 * التركيب:
 *   1. أنشئ جدول بيانات Google Sheets جديد فارغ (sheets.new).
 *   2. من القائمة: Extensions ← Apps Script.
 *   3. احذف كل محتوى Code.gs الافتراضي، والصق محتوى هذا الملف كاملًا.
 *   4. غيّر قيمة SECRET_TOKEN بالأسفل لأي نص عشوائي طويل تختاره أنت —
 *      هذا نفس الرمز اللي بتدخله لاحقًا بإعدادات التطبيق (المزيد ← مزامنة
 *      Google Sheets، خطوة 7 بملف README.md)، نفس القيمة بالضبط بالمكانين
 *      لأنه يُستخدم مفتاح تشفير من طرف التطبيق ورمز دخول يتحقق منه هذا
 *      السكربت.
 *   5. من محرر Apps Script اختر الدالة setup ثم اضغط ▶ Run — ينشئ ورقة
 *      واحدة (sync_data) لتخزين النص المشفّر. أول مرة بيطلب صلاحيات
 *      (Authorize access) — وافق (يشتغل بحسابك أنت على جدولك أنت فقط).
 *   6. Deploy ← New deployment ← Web app:
 *        - Execute as: Me
 *        - Who has access: Anyone
 *      انسخ الرابط المنتهي بـ /exec وألصقه بإعدادات التطبيق (مو بالكود —
 *      المستودع عام، فأي رابط/رمز بالكود يصير مرئي للجميع).
 *   7. أي تعديل لاحق على هذا الكود يحتاج Deploy ← Manage deployments
 *      ← ✎ تعديل ← Version: New version ← Deploy.
 */

// غيّر هذا لنفس القيمة الموجودة بـ src/config/sheetsSync.ts (SHEETS_SECRET_TOKEN)
var SECRET_TOKEN = 'CHANGE-ME-TO-A-LONG-RANDOM-SECRET'

var SHEET_NAME = 'sync_data'
var ROW_KEY = 'snapshot'
// Google Sheets يرفض أي خلية فوق 50,000 حرف — النص المشفّر يُقسَّم على عدة صفوف
// (snapshot، snapshot#1، snapshot#2 ...) بحد أقصى أقل من الحد الرسمي بهامش أمان.
var CHUNK_SIZE = 45000

/** شغّلها يدويًا مرة واحدة فقط من محرر Apps Script لإنشاء ورقة التخزين. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME)
  sheet.getRange(1, 1, 1, 3).setValues([['key', 'encrypted_value', 'updated_at']])
  sheet.setFrozenRows(1)

  var def = ss.getSheetByName('Sheet1')
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def)

  Logger.log('تم إنشاء ورقة التخزين المشفّر بنجاح: ' + SHEET_NAME)
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
  var ss = SpreadsheetApp.getActiveSpreadsheet()
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
