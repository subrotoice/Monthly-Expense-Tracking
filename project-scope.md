# Household Expense & Grocery Tracking App

## 1. Project Overview

Build a **mobile-first household expense and grocery tracking web application** for personal use.

The application will primarily be used from a mobile browser, so the entire UX should be designed around fast, simple, one-handed mobile usage.

The application should be built using:

* Next.js
* TypeScript
* App Router
* Tailwind CSS
* Database: PostgreSQL (Hosting: Neon)
* Prisma ORM
* PWA / offline support

The application should be lightweight, fast, maintainable, and production-ready.

The main purpose is to track household grocery and market expenses, understand spending patterns, maintain product price history, and manage a monthly grocery budget.

---

# 2. Main Concept

The application should be based around the concept of a **Shopping Session**.

For example, if I go to the local market and purchase:

* Rice — 5 kg — ৳350
* Potatoes — 2 kg — ৳80
* Onion — 1 kg — ৳100
* Eggs — 12 pieces — ৳150
* Fish — 1 kg — ৳450

These purchases should belong to one shopping session.

Example:

**Shopping Session**

Date: 17 August 2026
Market: Local Bazar

Items:

| Product | Quantity | Unit Price | Total |
| ------- | -------: | ---------: | ----: |
| Rice    |     5 kg |        ৳70 |  ৳350 |
| Potato  |     2 kg |        ৳40 |   ৳80 |
| Onion   |     1 kg |       ৳100 |  ৳100 |
| Eggs    |   12 pcs |     ৳12.50 |  ৳150 |
| Fish    |     1 kg |       ৳450 |  ৳450 |

**Total: ৳1,130**

The application should automatically calculate the session total.

---

# 3. Core Features

## 3.1 Dashboard

The dashboard should provide a quick overview of household spending.

Display:

* Today's expense
* This week's expense
* Current month's expense
* Montly expense will display as table where show session total as a row
* Monthly budget
* Amount spent
* Remaining budget
* Recent shopping sessions
* Recent purchases
* Spending by category
* Spending by market/shop

Example:

```text
Monthly Budget
৳20,000

Spent
৳13,450

Remaining
৳6,550
```

The dashboard should be optimized for mobile screens.

---

# 4. Shopping Session

A Shopping Session is the primary method of recording market purchases.

A session should contain:

* Date
* Market/shop
* Multiple products
* Quantity
* Unit
* Unit price
* Total price
* Optional notes
* Payment method
* Session total

The user should be able to add multiple products before saving the session.

The user should also be able to:

* Edit a session
* Delete a session
* Add an item
* Remove an item
* Change quantity
* Change price
* Change market
* Change date

---

# 5. Quick Add

Adding an expense should be extremely fast.

The goal is to allow the user to record a common purchase within approximately **10–15 seconds**.

The Quick Add interface should:

1. Search/select product
2. Enter quantity
3. Select unit
4. Enter price
5. Select market if necessary
6. Save

Avoid unnecessary fields and steps.

For frequently purchased products, the application should remember recent selections and prices.

---

# 6. Product Management

Create a master product database containing common grocery and household products used in Bangladesh.

Examples:

### Grocery

* Rice
* Lentils
* Flour
* Atta
* Maida
* Oil
* Salt
* Sugar
* Soap
* Detergent
* Tissue
* Dishwashing liquid
* Cleaning products
* Shampoo
* Toothpaste
* Toothbrush
* Other personal-care products

### Fruits

* Banana
* Apple
* Orange
* Mango
* Guava
* Papaya

### Vegetables

* Potato
* Onion
* Garlic
* Ginger
* Tomato
* Eggplant
* Cauliflower
* Cabbage
* Green chili
* Other vegetables

### Fish

* Rui
* Katla
* Hilsa
* Pangash
* Tilapia
* Other fish

### Meat

* Chicken
* Beef
* Mutton

### Dairy & Eggs

* Milk
* Eggs
* Yogurt
* Butter


The user must also be able to create custom products.

---

# 7. Bangladesh-Specific Units

The application must support common units used in Bangladesh.

Examples:

* kg
* gram
* liter
* milliliter
* piece
* dozen
* packet
* bottle
* box
* bundle
* pair
* sack
* other

The system should allow a product to have a default unit.

For example:

```text
Rice → kg
Oil → liter
Egg → piece
Milk → liter
```

The user should still be able to change the unit when recording a purchase.

---

# 8. Bangla, English & Banglish Product Search

The product search system is very important.

Products should support:

* Bangla name
* English name
* Banglish name
* Search aliases
* Search keywords


For example:

```text
Product:
পেঁয়াজ

English:
Onion

Banglish aliases:
peyaj
peyay
piaz
pyaj
```

Searching any of these should find the same product:

```text
পেঁয়াজ
onion
peyaj
peyay
piaz
```

Another example:

```text
Product:
আলু

English:
Potato

Banglish:
alu
aloo
```

Searching:

```text
আলু
potato
alu
aloo
```

should return the same product.

The search should be:

* Fast
* Mobile-friendly
* Case-insensitive
* Unicode-aware
* Bangla-aware
* Banglish-aware
* Able to search partial words

For example:

```text
pey
```

should be able to return:

```text
পেঁয়াজ
```

where appropriate. And I can add this later on, Like, আলু, potato, alu, aloo available later on i will able to add from app like alo for আলু

Design the database so that aliases can be added or modified later.

---

# 9. Product Price History

The application should maintain historical prices for products.

Whenever a product is purchased, record its price.

Example:

```text
Onion / পেঁয়াজ

10 Aug → ৳90/kg
13 Aug → ৳95/kg
17 Aug → ৳100/kg
```

The product details page should show:

* Current/latest price
* Previous prices
* Lowest recorded price
* Highest recorded price
* Average price
* Price history by date

The application should also show the previous price when adding a new purchase.

Example:

```text
Previous price: ৳95/kg

Current price: [ ৳100 ]

↑ ৳5 increase
```

---

# 10. Monthly Budget

The user should be able to define a monthly grocery/household budget.

Example:

```text
August 2026 Budget
৳20,000
```

The dashboard should calculate:

```text
Budget:       ৳20,000
Spent:        ৳13,450
Remaining:    ৳6,550
```

Also show:

* Percentage of budget used
* Daily average spending
* Estimated end-of-month spending
* Whether the current spending rate is above or below the expected rate

Allow different budgets for different months.

For example:

```text
July 2026 → ৳18,000
August 2026 → ৳20,000
September 2026 → ৳22,000
```

---


# 12. Expense History

Provide a complete history of all shopping sessions and purchases.

The user should be able to filter by:

* Date
* Date range
* Month
* Category
* Product
* Payment method

Support:

* Search
* Edit
* Delete
* View session details

Group expenses by day/month where appropriate.

---

# 13. Reports & Statistics

Provide useful but simple reports.

Examples:

### Monthly

* Total expense
* Average daily expense
* Total shopping sessions
* Highest spending day
* Highest spending category

### Product

* Most purchased products
* Most expensive products
* Product price history

### Category

* Grocery spending
* Vegetable spending
* Fish spending
* Meat spending
* Household spending

### Market

* Spending by market/shop

Use simple charts where they improve understanding.

Do not overcomplicate the UI.

---

# 14. Offline / PWA Support

Offline functionality is an important requirement.

The application should work as a Progressive Web App.

The user should be able to:

* Install the application on a mobile device
* Open it from the home screen
* View previously cached data
* Add expenses while offline
* Create shopping sessions while offline

When the internet connection becomes available, offline changes should synchronize with the server/database where applicable.

Design the architecture carefully so offline functionality does not cause duplicate or inconsistent records.

If full multi-device synchronization is not practical for the initial version, implement a reliable local-first architecture and clearly separate local data from synchronized data.

---

# 15. Backup & Export

The user should be able to export data.

Support:

* CSV
* Excel
* JSON

Allow exporting:

* All expenses
* Shopping sessions
* Products
* Price history
* Monthly reports

Also provide a database/data backup mechanism where practical.

The exported data should be structured and easy to restore or process later.

---

# 17. Mobile-First UI/UX

Mobile is the primary platform.

The application should:

* Make it only for mobile, so in desktop it looks same as mobile
* Have large touch targets
* Use simple forms
* Minimize typing
* Use bottom navigation if appropriate
* Provide quick access to "Add Expense"
* Use sticky action buttons where useful
* Avoid unnecessary modal dialogs
* Load quickly
* Work well on low-end Android devices
* Remain usable on slow internet connections

Suggested main navigation:

```text
Dashboard
Market
History
Products
More
```

The primary action should be easily accessible:

```text
+ Add Market Expense
```

---

# 18. Bangla / English Localization

The application architecture should support both Bangla and English.

Initially, the application may use English for the interface, but the codebase must be structured so Bangla localization can be added easily.

Product names should support both languages from the beginning.

For example:

```text
Bangla: পেঁয়াজ
English: Onion
Banglish: peyaj
```

Do not hard-code UI text throughout components.

Use a proper localization structure.

---

# 19. Database Architecture

Use PostgreSQL, Hosting: Neon with Prisma ORM.

Design a normalized relational schema.

Expected entities may include:

* Category
* Product
* ProductAlias
* Market
* ShoppingSession
* ShoppingItem
* Budget
* PaymentMethod
* PriceHistory

Consider whether separate Expense and ShoppingItem tables are actually necessary. Avoid duplicate data models and unnecessary complexity.

Important relationships:

```text
Category
   ↓
Product
   ↓
ShoppingItem
   ↓
ShoppingSession
   ↓
Market
```

Price history should be associated with products and purchases.
---

# 20. Suggested Application Pages

### Dashboard

`/`

### Add Shopping Session

`/market/new`

### Shopping Session Details

`/market/[id]`

### Expense History

`/history`

### Product List

`/products`

### Product Details

`/products/[id]`

### Categories

`/categories`

### Markets

`/markets`

### Budget

`/budget`

### Reports

`/reports`

### Settings

`/settings`

---

# 21. Technical Requirements

Use:

* Next.js
* TypeScript
* App Router
* Tailwind CSS
* Prisma
* PostgreSQL, Hosting: Neon
* PWA support
* Service Worker
* Modern React patterns

Use server components where appropriate and client components only where interaction is required.

Keep the architecture modular.

Create reusable components for:

* Product search
* Product selector
* Quantity input
* Price input
* Shopping item
* Shopping session
* Expense summary
* Budget progress
* Product price history

---

# 22. Performance Requirements

The application should be optimized for mobile.

Prioritize:

* Fast initial load
* Minimal JavaScript
* Efficient database queries
* Proper indexing
* Lazy loading where appropriate
* Optimized search
* Efficient offline storage
* No unnecessary dependencies

The Quick Add flow should feel instant.

---

# 23. Data Validation

Validate:

* Product name
* Quantity
* Unit
* Price
* Date
* Market
* Category
* Budget

Prevent:

* Negative prices
* Invalid quantities
* Corrupted shopping sessions
* Invalid relationships
* Duplicate products where avoidable

All calculations should be performed safely and consistently.

---

# 24. MVP Development Priority

Build the project in the following order.

### Phase 1 — Foundation

* Next.js setup
* TypeScript
* Tailwind
* Prisma
* PostgreSQL, Hosting: Neon
* Database schema
* Seed data

### Phase 2 — Master Data

* Categories
* Products
* Product aliases
* Markets
* Units

### Phase 3 — Core Expense System

* Shopping Session
* Shopping Items
* Quick Add
* Automatic totals
* Expense history

### Phase 4 — Intelligence

* Price history
* Previous price display
* Monthly budget
* Spending calculations

### Phase 5 — Mobile/PWA

* PWA
* Offline support
* Local storage/indexed database where appropriate
* Sync architecture

### Phase 6 — Reports

* Monthly reports
* Category reports
* Market reports
* Product statistics
* Charts

### Phase 7 — Backup & Export

* CSV
* Excel
* JSON
* Backup/restore

### Phase 8 — Polish

* Mobile UX improvements
* Bangla/English localization
* Search improvements
* Performance optimization
* Error handling
* Loading states
* Empty states
* Accessibility
* Final testing

---

# 25. Important Development Instructions for Codex

Before writing a large amount of code:

1. Analyze the entire project scope.
2. Identify missing or ambiguous requirements.
3. Propose the database schema.
4. Propose the application architecture.
5. Propose the folder structure.
6. Propose the main UI/navigation structure.
7. Explain the offline/PWA architecture.
8. Identify potential data synchronization problems.
9. Create a phased implementation plan.
10. Then implement the project phase by phase.

Do not over-engineer the application.

Prefer simple, maintainable solutions.

Do not add unnecessary libraries.

Use established Next.js and React patterns.

The application is for personal household expense tracking, not enterprise accounting software.

The most important priorities are:

1. **Fast mobile experience**
2. **Very quick expense entry**
3. **Accurate expense calculations**
4. **Easy product search**
5. **Bangla + English + Banglish product search**
6. **Reliable offline functionality**
7. **Simple and clean UI**
8. **Useful budget and price-history insights**
9. **Reliable data storage and backup**
10. **Maintainable code**

If any requirement is technically ambiguous, do not make a major architectural assumption silently. Explain the options and choose the simplest production-ready approach.

Start by analyzing the requirements and proposing the architecture and database schema before implementing the application.
