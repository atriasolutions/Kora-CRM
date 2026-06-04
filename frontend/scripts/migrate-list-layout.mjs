import fs from 'fs'
import path from 'path'

const pagesDir = path.join('src/pages')
const files = fs
  .readdirSync(pagesDir)
  .filter(
    (f) =>
      f.endsWith('Page.tsx') &&
      !f.includes('Detail') &&
      f !== 'QuotesPage.tsx' &&
      f !== 'ContactsPage.tsx' &&
      f !== 'ModuleListRoutePage.tsx' &&
      f !== 'DashboardPage.tsx' &&
      f !== 'SettingsPage.tsx' &&
      f !== 'ReportsPage.tsx',
  )

const feedbackRe =
  /\{feedback \? \(\s*<div[\s\S]*?<\/div>\s*\) : null\}\s*\n\s*\n/

const headerRe =
  /<(Contacts|Companies|Opportunities|Activities|Projects|Purchases|Inventory|Invoices|Products|StockReceipts)ModuleHeader[\s\S]*?\/>/

for (const file of files) {
  const fp = path.join(pagesDir, file)
  let text = fs.readFileSync(fp, 'utf8')
  if (text.includes('<ListPageLayout')) {
    console.log('skip', file)
    continue
  }
  if (!text.includes('ModuleHeader') && !text.includes('InventoryModuleHeader')) {
    console.log('no header', file)
    continue
  }

  if (!text.includes("ListPageLayout")) {
    if (!text.includes("ListPageFeedbackBanner")) {
      const anchor = text.includes('ModuleListPage')
        ? "import { ModuleListPage"
        : text.includes('InventoryProductList')
          ? "import { InventoryProductList"
          : null
      if (anchor) {
        text = text.replace(
          anchor,
          "import { ListPageLayout } from '@/components/list/ListPageLayout'\nimport { ListPageFeedbackBanner } from '@/components/list/ListPageFeedbackBanner'\n" +
            anchor,
        )
      }
    }
  }

  const hasFeedback = text.includes('const [feedback, setFeedback]')
  if (hasFeedback && !text.includes('feedbackBanner')) {
    text = text.replace(
      /(\n  return \(\n)/,
      `\n  const feedbackBanner =\n    feedback != null ? (\n      <ListPageFeedbackBanner\n        message={feedback.message}\n        onDismiss={() => setFeedback(null)}\n      />\n    ) : null\n$1`,
    )
    text = text.replace(feedbackRe, '')
  }

  const headerMatch = text.match(
    /<(Contacts|Companies|Opportunities|Activities|Projects|Purchases|Inventory|Invoices|Products|StockReceipts)ModuleHeader[\s\S]*?\n      \/>/,
  )
  if (!headerMatch) {
    console.log('header not found', file)
    continue
  }
  const header = headerMatch[0].trim()
  text = text.replace(headerMatch[0], '')

  const outerRe =
    /  return \(\n    <div className="space-y-[^"]+">/
  if (!outerRe.test(text)) {
    console.log('outer not found', file)
    continue
  }

  text = text.replace(
    outerRe,
    `  return (\n    <div className="flex min-h-0 flex-1 flex-col">\n      <ListPageLayout\n        ${hasFeedback ? 'feedback={feedbackBanner}\n        ' : ''}header={\n          ${header}\n        }\n      >`,
  )

  const dialogStart = text.search(/\n      <(?:Create|Edit|Duplicate|Import|Adjust|Dialog)/)
  if (dialogStart === -1) {
    console.log('dialog start not found', file)
    continue
  }
  text = text.slice(0, dialogStart) + '\n      </ListPageLayout>' + text.slice(dialogStart)

  fs.writeFileSync(fp, text)
  console.log('ok', file)
}
