"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type SavedTest = any;

export default function SavedTestsList({
  items,
  loading,
  onOpen,
  initialPageSize = 10,
  renderActions,
  layout = "list",
  itemsOnly = false,
}: {
  items: SavedTest[] | null | undefined;
  loading?: boolean;
  onOpen?: (id: string) => void;
  initialPageSize?: number;
  renderActions?: (t: any) => React.ReactNode;
  layout?: "list" | "card";
  itemsOnly?: boolean;
}) {
  // if itemsOnly is true, component will just render the provided items array
  // without its own search / pagination controls.
  // This allows the admin page to reuse the UI rendering while keeping
  // custom top controls and pagination.
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("takenAt");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const list = items || [];

  // If itemsOnly was passed, render only the provided items without
  // the built-in search / filter / pagination controls.
  if (itemsOnly) {
    const provided = list;
    if (provided.length === 0) {
      return (
        <div className="text-sm text-muted-foreground mt-2">
          No saved tests.
        </div>
      );
    }
    return (
      <div>
        {layout === "list" ? (
          <ul className="space-y-2 mt-2">
            {provided.map((t: any) => (
              <li
                key={t.id}
                className="p-2 border rounded flex items-center justify-between"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {t.title} - {t.testType} - {t.percentage}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(t.takenAt).toLocaleString("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                    })}{" "}
                    {t.isPublic ? "• Public" : "• Private"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {renderActions ? (
                    renderActions(t)
                  ) : (
                    <Button size="sm" onClick={() => onOpen && onOpen(t.id)}>
                      Open
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
            {provided.map((t: any) => (
              <div
                key={t.id}
                className="border rounded p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="font-medium text-lg">
                    {t.title} - {t.testType} - {t.percentage}%
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {t.description || ""}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {t.isActive ? "Active" : "Inactive"} •{" "}
                    {t.isPublic ? "Public" : "Private"}
                  </div>
                  <div className="flex items-center gap-3">
                    {renderActions ? (
                      renderActions(t)
                    ) : (
                      <Button size="sm" onClick={() => onOpen && onOpen(t.id)}>
                        Open
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const filtered = useMemo(() => {
    const q = (searchQuery || "").toLowerCase();
    return list
      .filter((t: any) => {
        if (!t) return false;
        if (
          filterType !== "all" &&
          String(t.testType).toLowerCase() !== filterType
        )
          return false;
        if (!q) return true;
        return (
          String(t.title || "")
            .toLowerCase()
            .includes(q) ||
          String(t.testType || "")
            .toLowerCase()
            .includes(q) ||
          String(t.percentage || "")
            .toLowerCase()
            .includes(q)
        );
      })
      .sort((a: any, b: any) => {
        if (sortBy === "takenAt")
          return new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime();
        if (sortBy === "percentage")
          return (b.percentage || 0) - (a.percentage || 0);
        if (sortBy === "title")
          return String(a.title || "").localeCompare(String(b.title || ""));
        return 0;
      });
  }, [list, searchQuery, filterType, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Saved Tests</h2>
        <div className="flex items-center gap-2">
          <input
            placeholder="Search title/type/percent"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="p-2 border rounded w-64"
          />
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setPage(1);
            }}
            className="p-2 border rounded"
          >
            <option value="all">All types</option>
            <option value="vtep">Vtep</option>
            <option value="practice">Practice</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="takenAt">Newest</option>
            <option value="percentage">Score</option>
            <option value="title">Title</option>
          </select>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="p-2 border rounded"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="mt-2">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground mt-2">
          No saved tests.
        </div>
      ) : (
        <>
          {layout === "list" ? (
            <ul className="space-y-2 mt-2">
              {pageItems.map((t: any) => (
                <li
                  key={t.id}
                  className="p-2 border rounded flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {t.title} - {t.testType} - {t.percentage}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(t.takenAt).toLocaleString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                      })}{" "}
                      {t.isPublic ? "• Public" : "• Private"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderActions ? (
                      renderActions(t)
                    ) : (
                      <Button size="sm" onClick={() => onOpen && onOpen(t.id)}>
                        Open
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
              {pageItems.map((t: any) => (
                <div
                  key={t.id}
                  className="border rounded p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="font-medium text-lg">
                      {t.title} - {t.testType} - {t.percentage}%
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {t.description || ""}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {t.isActive ? "Active" : "Inactive"} •{" "}
                      {t.isPublic ? "Public" : "Private"}
                    </div>
                    <div className="flex items-center gap-3">
                      {renderActions ? (
                        renderActions(t)
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => onOpen && onOpen(t.id)}
                        >
                          Open
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1} -{" "}
              {Math.min(page * pageSize, filtered.length)} of {filtered.length}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Prev
              </Button>
              <div className="text-sm">
                Page {page} / {totalPages}
              </div>
              <Button
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
