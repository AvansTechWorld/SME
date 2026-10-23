# SME Tracker

An offline-first installable web app (PWA) for a small shop: sell fast, track stock (pieces and cartons), customer dinau, money, loans and profit. No build step, no server, no account. Everything is stored on the device.

Hosted on GitHub Pages: copy this folder to your repo root (replace the old files), commit, and reload twice so the new service worker takes over.

## Look and feel
Modern flat style with a glass header, a floating bottom bar with **Sell raised in the centre**, five palettes (Mint, Indigo, Violet, Graphite, Coral; light and dark), a number keypad at checkout, swipe-to-remove basket lines, a side rail and two-pane Sell screen on tablets, "Same again" for repeat sales, a **Tools** sheet (price and margin calculator with carton-to-item cost, till cash count for kina notes and coins, restock list you can copy or share; open it from Stock, or "Count till" on Accounts), and a Today strip (sales, count, profit) above the items, and a simple shopping-bag-with-K icon (with an Android themed-icon layer). The last two blocks of `css/app.css` ("Register skin", "Modern layer") hold the styling. Styles live at the bottom of `css/app.css` ("Register skin"); the keypad is `js/register.js`.

## Screens
| Tab | What it does |
|---|---|
| **Sell** | Tap items to build a basket, tap **Charge**. Walk-in by default. Hold orders, discounts, split payments, undo last sale. |
| **Stock** | Items, cartons, restock, count stock, add many at once, order list, potential profit. |
| **Customers** | Dinau balances, take payments, reminders, rename "no name yet" customers. |
| **Accounts** | Three parts: **Numbers** (tap a name to copy its account number, search, edit), **Money** (cash/mobile, move money, expenses, close the day) and **Loans** (given and taken, interest calculator). |
| **Reports** | Profit for today / 7 / 30 days / all time, what the business is worth, profit sitting on the shelf, best sellers, full history with receipts. |
| **Settings** (sliders icon) | Shop details, light/dark and colour theme, locked backup, restore, exports, activity log. |

## Moving over from paper or an older version
The **Getting started** list on the Sell tab walks you through it (hide it any time; bring it back in Settings):
1. Enter the cash and mobile-banking money you have now.
2. Add your items: paste a list from Excel, or choose a .csv file (Stock, Add many).
3. Add customers who owe you, with the amount and the date they started owing (Customers, Add many). This is recorded as *owed from before*: it is not a sale, not profit and not cash, but it counts in what customers owe you and ages from the date you give.
4. Save your account numbers, set up the locked backup, and install the app.

From an older version of SME Tracker: Settings, Restore, pick your .smebak file (or the plain export). Nothing else is needed.

## Business rules
- **Walk-in sales** need no name. A customer is only created when someone buys on dinau, or when you add them. If an unpaid sale has no name, the picker offers "Add and use" with the name left empty, and the customer is saved as *Customer 1, 2…* (flagged "no name yet") so the debt is never lost. Rename later in Customers.
- **Cartons.** Stock is always counted in single pieces. An item with "pieces per carton" can be added, restocked, counted and sold by the carton. Cost per piece and per carton stay in sync. A **+ ctn** button on the Sell tile adds a carton at the carton price (or pieces × price if none is set).
- **Restock** uses weighted-average cost and is paid from cash or mobile. Opening stock is not a purchase.
- **Profit** = gross profit − expenses − stock losses − bad debts − loan interest paid + interest earned on loans given − loans given that were written off. Borrowed money is not income; lent money is not an expense; owner drawings are not an expense.
- **Dinau ageing** is first-in-first-out: payments clear the oldest sale first.
- **Net worth** = cash + mobile + dinau + stock at cost + lent principal still owed − loans owed.
- Every figure is derived from one append-only list of transactions, so editing or deleting an entry recalculates everything.

## Data and compatibility
Same storage key (`sme.tracker.v1`) and `.smebak` format as earlier versions. Opening this version on a device with older data migrates it automatically (old light/dark choice kept, staff names dropped, old activity log still verifies). The old "who is using the app" prompt is gone.

## Files
`index.html`, `css/app.css`, `js/*.js` (util, store, calc, ui, sell, stock, people, money, receipt, report, backup, settings, register, boot), `sw.js`, `manifest.webmanifest`, icons, `screenshots/`.

When you change any file, bump `CACHE` in `sw.js` and add new files to `FILES`.
