const ExcelJS = require("exceljs");

const sendWorkbook = async (res, filename, columns, rows) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sheet1");
  sheet.columns = columns;
  sheet.addRows(rows);

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

  await workbook.xlsx.write(res);
  res.end();
};

module.exports = { sendWorkbook };
