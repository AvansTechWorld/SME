# SME Tracker

Offline PWA for a small shop: stock, sales, customer debt (dinau) and cash.
Plain HTML/CSS/JS, no build step. All data stays on the device (localStorage key `sme.tracker.v1`).

## Run locally
    python3 -m http.server 8000   # then open http://localhost:8000

## Deploy (GitHub Pages)
Push these files to the repo root, then Settings → Pages → Deploy from branch → main / root.
Open the https link on your phone and use the Install banner (Android) or Share → Add to Home Screen (iPhone).

## Updating
Change any file, then bump `CACHE` in `sw.js` (e.g. `sme-tracker-v3`) so installed copies refresh.

## Back up
Report → Backup & security → **Set backup passphrase**, then **Backup now**. The data is encrypted on the phone (AES-256-GCM, key from your passphrase via PBKDF2) into a `.smebak` file; choose Proton Drive in the share sheet. A banner asks once a day while a backup is due.
Proton Drive has no supported upload API for web apps yet, so the last step is a tap in the share sheet. `CLOUD.upload` in `index.html` is the hook to automate it later.
Restore: Report → Restore, pick the file, type the passphrase. **If the passphrase is lost the backups cannot be opened.**
"Export plain file" still makes an unencrypted JSON copy.

## Helpers and the activity log
There is no PIN: helpers can run the shop. Each time the app opens it asks who is using it, and that name is saved on every sale and change.
Report → **Activity log** lists everything with the phone's date and time, including edits and deletions (with what the entry was before). Edited dates show "⚠️ date changed". The log is chained, so an altered or removed entry, or the clock being set back, shows a ⚠️ warning.
Limits, honestly: names are not passwords (anyone can pick any name), the time comes from the phone's clock, and someone with developer tools could rewrite everything. Your real evidence is the daily encrypted backup: it is a copy outside the phone that helpers can't touch. Compare it with the live log. "Erase all" has been removed from the app.

## Installing it as an app (phones and computers)
It is a PWA: host it on HTTPS (GitHub Pages is fine), open the link once while online, then install:
- **Android (Chrome):** tap the Install banner, or ⋮ → Install app.
- **iPhone / iPad (Safari):** Share → Add to Home Screen.
- **Windows / Mac / Chromebook (Chrome or Edge):** click the install icon at the right of the address bar, or menu → Install SME Tracker. Safari on Mac: File → Add to Dock.
It then opens in its own window with its own icon and works offline. Long-press the icon for shortcuts (New sale, Dinau, Report).
Each device keeps its own data; use the encrypted backup to move or protect it. Firefox on desktop cannot install PWAs.

## Business rules (how the numbers work)
- **Cash in hand** = cash received on sales + dinau payments + cash added − restocks − expenses. Opening stock is not a purchase, so it doesn't reduce cash.
- **Gross profit** = (price − cost) × qty using the cost at the time of sale. Restocks update an item's cost as a **weighted average** of what's on hand and the new purchase.
- **Net profit** = gross profit − expenses − stock losses (from "Fix count" write-offs, valued at cost).
- **Dinau age** is how long the *oldest unpaid* credit has been owing: payments clear the oldest credit first (FIFO). A small payment doesn't reset the clock.
- **Credit limit** per customer (0 = none) warns at checkout; selling below cost also warns.
- Deleting a customer erases their transactions (the confirm shows the cash impact). Deletions that would make stock negative are blocked.
- **Bad-debt write-off** forgives a customer's balance, moves no cash, and counts as a loss in net profit.
- **Owner drawings** reduce money on hand but are not an expense and not in profit; shown on their own line.
- **Payment method** (cash / mobile banking) tags sales, payments, expenses and drawings; "Cash in hand" is cash only, "Money by method" shows both.
- **Receipts** are numbered (R-00001…); deleted numbers leave gaps, which an auditor can see.
- **Split payment**: the Split button on Sell records part cash, part mobile banking on one sale.
- **Discounts** (% Off in the cart) keep the list price, so Report shows "Discounts given" separately from price edits.
- **Returns**: ↩️ on a sale in Recent activity. Stock goes back, sales and profit go down, and the money goes back as cash, mobile banking, or off the customer's dinau.
- **Close the day** (Report): count the till; any difference is recorded as a cash adjustment and the last cash-up shows on Report.
- **Count stock** (Stock): type real counts for many items at once; only differences are recorded, as stock losses or gains at cost.
- **Loans you took**: borrowing is not income and principal repayments are not expenses; only the interest counts against profit. Net position subtracts loans owed.
- **If you sell all your stock** (Report): potential profit, margin and markup on what is on the shelf.
- **Undo last sale** appears under the cart for 30 minutes after a sale. On a computer, Enter in the search box adds the first match and Enter in "Customer gives" completes the sale.
- Not modelled: supplier credit, tax/GST, fractional quantities, PIN/roles, syncing between devices.

## Look and feel
- **Customer gives**: tap a note (K5, K10, K20…) or type an amount. If it's more than the total the app shows big "Give change"; if it's less, it shows how much that customer will owe in total. Edit the note buttons in Report → Settings.
- Report → Settings: pick a colour, switch light/dark mode.
- Stock: give any item an emoji; it shows on the Sell buttons.
