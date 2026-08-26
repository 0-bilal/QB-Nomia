/**
 * QB-Nomia — Google Apps Script (خادم المزامنة مع Google Sheets)
 * ============================================================
 *
 * هذا الملف يُلصق بالكامل داخل محرر Apps Script المرتبط بجدول بيانات
 * Google Sheets (وليس بمشروع مستقل). خطوات التركيب بالتفصيل موجودة
 * بملف google-apps-script/README.md بنفس المجلد — هذا ملخصها:
 *
 *   1. أنشئ جدول بيانات Google Sheets جديد فارغ (sheets.new).
 *   2. من القائمة: Extensions ← Apps Script.
 *   3. احذف كل محتوى Code.gs الافتراضي، والصق محتوى هذا الملف كاملًا.
 *   4. غيّر قيمة SECRET_TOKEN بالأسفل لأي نص عشوائي طويل تختاره أنت
 *      (يشبه كلمة سر) — هذا هو اللي يمنع أي شخص غيرك من الوصول لجدولك
 *      حتى لو خمّن رابط الويب أب.
 *   5. من القائمة العلوية بمحرر Apps Script اختر الدالة setup ثم اضغط
 *      ▶ Run (زر التشغيل) — هذا ينشئ كل الأوراق (Sheets) والأعمدة
 *      اللازمة تلقائيًا داخل جدول البيانات. أول مرة بيطلب منك صلاحيات
 *      (Authorize access) — وافق عليها (هذا السكربت يشتغل بحسابك أنت
 *      فقط على جدولك أنت، ولا يصل لأي شيء غير هذا الجدول).
 *   6. Deploy ← New deployment ← اختر النوع "Web app":
 *        - Execute as: Me
 *        - Who has access: Anyone
 *      ثم Deploy. انسخ الرابط اللي ينتهي بـ /exec — هذا هو "رابط
 *      Google Apps Script" اللي تحطه بإعدادات التطبيق (المزيد ← ربط
 *      Google Sheets)، مع نفس SECRET_TOKEN اللي اخترته بالخطوة 4.
 *   7. أي تعديل لاحق على هذا الكود يحتاج Deploy ← Manage deployments
 *      ← ✎ تعديل ← Version: New version ← Deploy، حتى يتحدث الرابط
 *      الحي بالتعديلات.
 */

// غيّر هذا لأي نص سري عشوائي طويل من اختيارك قبل النشر
var SECRET_TOKEN = 'CHANGE-ME-TO-A-LONG-RANDOM-SECRET'

// أسماء الأوراق وأعمدتها — يجب أن تطابق بالضبط بنية البيانات بالتطبيق
var SCHEMAS = {
  accounts: ['id', 'name', 'type', 'balance', 'goalAmount', 'goalLabel'],
  people: ['id', 'name', 'phone', 'note', 'createdAt'],
  loanTransactions: ['id', 'personId', 'direction', 'amount', 'accountId', 'date', 'dueDate', 'note'],
  categories: ['id', 'name', 'kind', 'budgetLimit'],
  incomeSources: ['id', 'name'],
  transactions: ['id', 'type', 'amount', 'date', 'note', 'accountId', 'categoryId', 'incomeSourceId', 'transferToAccountId'],
  subscriptions: ['id', 'name', 'provider', 'cost', 'billingCycle', 'nextRenewalDate', 'accountId', 'status'],
}

/** شغّلها يدويًا مرة واحدة فقط من محرر Apps Script لإنشاء كل الأوراق. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  Object.keys(SCHEMAS).forEach(function (name) {
    var sheet = ss.getSheetByName(name)
    if (!sheet) sheet = ss.insertSheet(name)
    var headers = SCHEMAS[name]
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    sheet.setFrozenRows(1)
  })
  // احذف ورقة "Sheet1" الافتراضية الفارغة لو موجودة
  var def = ss.getSheetByName('Sheet1')
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def)

  Logger.log('تم إنشاء كل الأوراق بنجاح: ' + Object.keys(SCHEMAS).join(', '))
}

function doGet(e) {
  try {
    var action = e.parameter.action
    checkToken(e.parameter.token)

    if (action === 'pull') {
      return jsonResponse({ ok: true, data: pullAll() })
    }
    return jsonResponse({ ok: false, error: 'إجراء غير معروف: ' + action })
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) })
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents)
    checkToken(body.token)

    if (body.action === 'push') {
      pushAll(body.data || {})
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

function pullAll() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var result = {}
  Object.keys(SCHEMAS).forEach(function (name) {
    result[name] = readSheet(ss, name)
  })
  return result
}

function readSheet(ss, name) {
  var sheet = ss.getSheetByName(name)
  if (!sheet) return []
  var values = sheet.getDataRange().getValues()
  if (values.length < 2) return []
  var headers = values[0]
  var rows = values.slice(1)
  return rows
    .filter(function (row) {
      return row[0] !== '' && row[0] !== null // تجاهل الصفوف الفارغة
    })
    .map(function (row) {
      var obj = {}
      headers.forEach(function (h, i) {
        var v = row[i]
        if (v === '' || v === null || v === undefined) return // اترك الحقل الاختياري غير معرّف
        obj[h] = v
      })
      return obj
    })
}

function pushAll(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  Object.keys(SCHEMAS).forEach(function (name) {
    writeSheet(ss, name, data[name] || [])
  })
}

function writeSheet(ss, name, rows) {
  var sheet = ss.getSheetByName(name)
  if (!sheet) {
    sheet = ss.insertSheet(name)
  }
  var headers = SCHEMAS[name]
  sheet.clear()
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
  sheet.setFrozenRows(1)

  if (!rows.length) return

  var values = rows.map(function (row) {
    return headers.map(function (h) {
      var v = row[h]
      return v === undefined || v === null ? '' : v
    })
  })
  sheet.getRange(2, 1, values.length, headers.length).setValues(values)
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}
