import type { ReactNode } from "react";

type DataTableColumn<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  emptyMessage?: string;
};

function DataTable<T extends Record<string, ReactNode>>({
  columns,
  data,
  emptyMessage = "Belum ada data.",
}: DataTableProps<T>) {
  return (
    <div className="data-table" role="region" tabIndex={0}>
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((row, rowIndex) => (
              <tr key={row.id ? String(row.id) : rowIndex}>
                {columns.map((column) => (
                  <td key={String(column.key)}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="data-table__empty" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
