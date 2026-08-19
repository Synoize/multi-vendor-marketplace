import { useMemo, useState, useCallback } from 'react';
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table';

export default function DataTable({
  columns: rawColumns = [],
  data = [],
  loading = false,
  emptyMessage = 'No data found',
  onRowClick,
  total,
  page,
  onPageChange,
  sorting: externalSorting,
  onSortingChange: externalOnSortingChange,
  pageSize: externalPageSize = 10,
  enableSearch = true,
  enableExport = true,
  enableColumnVisibility = true,
  enablePagination = true,
  enableColumnFilters = false,
  enableRowSelection = false,
  manualPagination = false,
  manualSorting = false,
  renderTopToolbarCustomActions,
  muiTableBodyRowProps: customRowProps,
}) {
  const columns = useMemo(() => {
    return rawColumns.map((col) => ({
      accessorKey: col.key,
      header: col.label,
      size: col.key === 'id' ? 80 : undefined,
      enableSorting: col.sortable !== false,
      Cell: col.render
        ? ({ cell, row }) => col.render(cell.getValue(), row.original)
        : undefined,
    }));
  }, [rawColumns]);

  const [internalSorting, setInternalSorting] = useState([]);
  const [internalPageSize, setInternalPageSize] = useState(externalPageSize);
  const [internalPageIndex, setInternalPageIndex] = useState(0);

  const sorting = externalSorting ?? internalSorting;
  const isServerPaginated = page !== undefined;

  const handleSortingChange = useCallback(
    (updater) => {
      const newSorting =
        typeof updater === 'function'
          ? updater(sorting)
          : updater;
      if (externalOnSortingChange) {
        externalOnSortingChange(newSorting);
      } else {
        setInternalSorting(newSorting);
      }
    },
    [sorting, externalOnSortingChange],
  );

  const pageSize = isServerPaginated ? (externalPageSize !== 10 ? externalPageSize : internalPageSize) : internalPageSize;

  const paginationState = useMemo(() => ({
    pageIndex: isServerPaginated ? page - 1 : internalPageIndex,
    pageSize,
  }), [isServerPaginated, page, internalPageIndex, pageSize]);

  const handlePaginationChange = useCallback(
    (updater) => {
      const newPagination =
        typeof updater === 'function'
          ? updater(paginationState)
          : updater;
      const newPageIndex = newPagination.pageIndex;
      const newPageSize = newPagination.pageSize;
      setInternalPageSize(newPageSize);
      setInternalPageIndex(newPageIndex);
      if (onPageChange) {
        onPageChange(newPageIndex + 1, newPageSize);
      }
    },
    [onPageChange, paginationState],
  );

  const table = useMaterialReactTable({
    columns,
    data,
    state: {
      isLoading: loading,
      pagination: paginationState,
      sorting,
    },
    onPaginationChange: handlePaginationChange,
    onSortingChange: handleSortingChange,
    manualPagination,
    manualSorting,
    rowCount: total ?? data.length,

    enablePagination,
    enableColumnActions: false,
    enableColumnFilters,
    enableSorting: true,
    enableHiding: enableColumnVisibility,
    enableTopToolbar: enableSearch || enableExport || enableColumnVisibility || !!renderTopToolbarCustomActions,
    enableBottomToolbar: enablePagination,
    enableRowSelection,

    initialState: {
      density: 'compact',
      showColumnFilters: enableColumnFilters,
    },

    mrtTheme: {
      baseColor: '#f9fafb',
      bgcolor: 'transparent',
    },

    renderTopToolbarCustomActions: ({ table }) => {
      if (renderTopToolbarCustomActions) {
        return renderTopToolbarCustomActions({ table, data });
      }
      return undefined;
    },

    muiTableBodyRowProps: customRowProps || (onRowClick
      ? ({ row }) => ({
          onClick: () => onRowClick(row.original),
          sx: { cursor: 'pointer' },
        })
      : undefined),

    muiTablePaperProps: {
      elevation: 0,
      sx: {
        border: 'none',
        background: 'transparent',
      },
    },

    muiTableContainerProps: {
      sx: { maxHeight: 'none' },
    },

    muiTableProps: {
      sx: {
        borderCollapse: 'separate',
        borderSpacing: 0,
      },
    },

    muiTableHeadCellProps: {
      sx: {
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: '#6b7280',
        borderBottom: '1px solid #f3f4f6',
        background: '#fafafa',
        padding: '12px 16px',
      },
    },

    muiTableBodyCellProps: {
      sx: {
        borderBottom: '1px solid #f3f4f6',
        padding: '12px 16px',
        fontSize: '14px',
      },
    },

    muiTableBodyProps: {
      sx: {
        '& tr:hover': {
          backgroundColor: '#f9fafb !important',
        },
      },
    },

    renderEmptySkeletonRows: () => null,
    noResultsMessage: emptyMessage,
  });

  return (
    <div className="overflow-x-auto">
      <MaterialReactTable table={table} />
    </div>
  );
}
