
# 🛒 E-Commerce Product Scraper (HTML, CSS, JavaScript)

A simple browser-based scraper that extracts **product names, prices, and ratings** from a given e-commerce product page URL.
If no URL is provided, it will load **demo product information** so you can test the features instantly.
The results can be viewed in a table and downloaded as a CSV file.

---

## 📌 Features

* Extracts **Product Name**, **Price**, and **Rating**.
* **URL mode:** Fetch HTML from a provided e-commerce URL.
* **Demo mode:** Uses sample data if no URL is entered.
* Display results in a clean, responsive table.
* Export results to a **CSV file**.

---

## 📂 Project Structure

```
ecommerce-product-scraper/
│
├── index.html   # Main HTML page
├── style.css    # Styling
├── script.js    # JavaScript logic

```

---

## 🛠️ Installation & Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/AnuragPatil3781/SCT_SD_4
   ```
2. Open `index.html` in your browser — no server setup needed.

---

## 📜 Usage

1. **Enter a product page URL** in the input box.

   * Click **Fetch Products** to extract data from the URL.
   * If CORS prevents live fetching, copy the HTML of the page into `demo.html` and run in demo mode.
2. **Leave the URL blank** to run in **demo mode** with sample products.
3. View results in the table.
4. Click **Download CSV** to save the data locally.

---

## 💻 Example Output

| Product Name        | Price   | Rating |
| ------------------- | ------- | ------ |
| Example Product One | \$19.99 | 4.5    |
| Example Product Two | \$25.49 | 4.0    |

---

## 📦 Technologies Used

* **HTML5** – UI structure.
* **CSS3** – Styling and layout.
* **JavaScript (ES6)** – Data fetching, HTML parsing, CSV export.

---

## ⚠️ Disclaimer

* Fetching live e-commerce HTML directly from JavaScript may be blocked due to **CORS policy**.
* For unrestricted scraping, use a server-side script or a public API.
* Always follow the target site’s **robots.txt** and **terms of service**.

---

## 📄 License

This project is licensed under the **MIT License**.

---
