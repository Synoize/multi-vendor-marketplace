/**
 * Damini Marketplace - Excel / Spreadsheet Utilities
 * Builds the bulk variant import template (.xlsx) and parses uploaded
 * spreadsheets (.xlsx / .xls / .csv) into normalized rows.
 */

const ExcelJS = require("exceljs");
const path = require("path");
const { Readable } = require("stream");

// Fixed columns shared by every variant template. Anything after these is an
// attribute column (e.g. Color, Size, Material).
const VARIANT_FIXED_COLUMNS = [
  "Variant Name",
  "SKU",
  "Price",
  "MRP",
  "Stock",
  "Image URL",
];

// Known attribute keys pre-seeded into the template so sellers can just fill
// the values. Extra columns added by the seller are treated as attributes too.
const VARIANT_SAMPLE_ATTRIBUTE_KEYS = [
  "Color",
  "Size",
  "Material",
  "Style",
  "Weight",
  "Type",
  "Finish",
  "Pattern",
];

// Canonical header aliases → normalized field key
const HEADER_ALIASES = {
  "variant name": "name",
  variant: "name",
  name: "name",
  sku: "sku",
  "variant sku": "sku",
  price: "price",
  "selling price": "price",
  "sale price": "price",
  mrp: "mrp",
  "max retail price": "mrp",
  stock: "stock",
  "stock qty": "stock",
  "stock quantity": "stock",
  qty: "quantity",
  quantity: "quantity",
  image: "image",
  "image url": "image",
  "image link": "image",
  "variant image": "image",
  "variant image url": "image",
};

/**
 * Return a normalized, human-readable cell value as a string.
 * Excel returns real Date objects for date cells; convert those to a plain
 * ISO date. Everything else is trimmed.
 */
const cellToString = (value) => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return value.toISOString().slice(0, 10);
  }
  if (value && typeof value === "object" && value.result !== undefined) {
    return String(value.result).trim(); // formula result
  }
  return String(value).trim();
};

/** Build the downloadable variant import template (.xlsx). */
const buildVariantTemplateBuffer = async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "The Damini Edit";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Variant Import", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const headers = [...VARIANT_FIXED_COLUMNS, ...VARIANT_SAMPLE_ATTRIBUTE_KEYS];
  const headerRow = sheet.addRow(headers);
  headerRow.height = 20;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2874F0" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
    };
  });

  // Column widths
  const widths = {
    "Variant Name": 28,
    SKU: 22,
    Price: 12,
    MRP: 12,
    Stock: 10,
    "Image URL": 30,
  };
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const header = headers[colNumber - 1];
    sheet.getColumn(colNumber).width = widths[header] || 16;
  });

// Example row so sellers can see the expected format. Highlighted yellow
  // and italic so it is easy to spot — sellers should delete it before
  // uploading the file. Only the minimal required fields are filled in.
  const examples = [
    ["", "", 499, 799, "", "", "Red", "M"],
  ];
  for (const example of examples) {
    const row = sheet.addRow(example);
    row.height = 18;
    row.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFF3CD" },
      };
      cell.font = { italic: true, color: { argb: "FF8A6D3B" } };
    });
  }

  // Short instructions in a second "Instructions" sheet
  const instructions = workbook.addWorksheet("Instructions");
  instructions.columns = [{ width: 4 }, { width: 42 }];
  const lines = [
    ["How to use this template"],
    [],
    ["1", "Fill in one row per variant."],
    [
      "2",
      "Variant Name is optional - if blank it is built from the attribute values.",
    ],
    [
      "3",
      "SKU is optional - if blank a unique SKU is generated automatically.",
    ],
    [
      "4",
      "Price (selling) and MRP are required. Price cannot be higher than MRP.",
    ],
    ["5", "Stock defaults to 0 when left empty."],
    ["6", "Image URL is optional - paste a direct link to the variant image."],
    ["7", "Attribute columns (Color, Size, Material, ...) define the variant."],
    ["8", "Every variant must have at least one attribute filled in."],
    ["9", "You may add your own extra attribute columns at the end."],
    [
      "10",
      "Two rows with the same attributes are duplicates and will be rejected.",
    ],
    [],
    [
      "TIP",
      "The single yellow row after the header is an example. Replace it with your own data or delete it before uploading.",
    ],
    [],
    ["Upload the completed file from the Variants section of your product."],
  ];
  for (const [no, text] of lines) {
    const row = instructions.addRow([no, text]);
    if (no && no === "1") {
      row.getCell(1).font = { bold: true };
      row.getCell(2).font = { bold: true };
    }
  }

  return workbook.xlsx.writeBuffer();
};

/**
 * Parse an uploaded spreadsheet (xlsx/xls/ods/csv) into normalized rows.
 * Returns `{ columns, rows }` where every row is
 * `{ rowNumber, values: { <normalizedKey>: <string> } }` and `columns` holds
 * the discovered column keys in sheet order. Fully empty rows are dropped.
 */
const readSpreadsheetRows = async (buffer, filename = "") => {
  const ext = path.extname(filename || "").toLowerCase();
  const workbook = new ExcelJS.Workbook();

  try {
    if (ext === ".csv") {
      await workbook.csv.read(Readable.from(buffer));
    } else {
      await workbook.xlsx.load(buffer);
    }
  } catch (err) {
    if (ext === ".csv" || ext === ".xlsx") {
      throw new Error(
        "The uploaded file could not be parsed. Please use the downloaded .xlsx template or a plain .csv file.",
      );
    }
    throw new Error(
      "Unsupported file format. Please upload a .xlsx or .csv file.",
    );
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) return { columns: [], rows: [] };

  let headers = null;
  const rows = [];

  sheet.eachRow((row, rowNumber) => {
    const values = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      values[col - 1] = cellToString(cell.value);
    });

    // Trim trailing empties but keep bracketed content intact
    while (values.length && values[values.length - 1] === "") values.pop();
    if (!values.length) return;

    if (!headers) {
      // First non-empty row is the header. Map aliases → canonical keys and
      // keep every non-empty header (attribute columns included).
      headers = values.map((h) => {
        const trimmed = h.replace(/\s+/g, " ").trim();
        const lower = trimmed.toLowerCase();
        return HEADER_ALIASES[lower] || trimmed;
      });
      return;
    }

    const record = {};
    headers.forEach((key, i) => {
      const value = values[i];
      if (value !== undefined && value !== null && value !== "") {
        record[key] = value;
      }
    });

    // A row is meaningful only if it carries at least one value.
    if (Object.keys(record).length) {
      rows.push({ rowNumber, values: record });
    }
  });

  return { columns: headers || [], rows };
};

module.exports = {
  buildVariantTemplateBuffer,
  readSpreadsheetRows,
  VARIANT_FIXED_COLUMNS,
  VARIANT_SAMPLE_ATTRIBUTE_KEYS,
};
