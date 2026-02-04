"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

type SavedTest = any;

export default function SavedTestsList({
  items,
  loading,
  onOpen,
  onDelete,
  initialPageSize = 10,
  renderActions,
  layout = "list",
  itemsOnly = false,
  showProgress = true,
}: {
  items: SavedTest[] | null | undefined;
  loading?: boolean;
  onOpen?: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
  initialPageSize?: number;
  renderActions?: (t: any) => React.ReactNode;
  layout?: "list" | "card";
  itemsOnly?: boolean;
  showProgress?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("takenAt");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [deleting, setDeleting] = useState<string | null>(null);

  const list = items || [];

  const handleDelete = async (id: string, title: string) => {
    if (!onDelete) return;
    if (!confirm(`Delete test "${title}"?\n\nThis action cannot be undone.`)) return;
    try {
      setDeleting(id);
      await onDelete(id);
    } catch (err) {
      console.error("Failed to delete test:", err);
      alert("Delete failed. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

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
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium truncate flex items-center gap-2">
                      <span>{t.title}</span>
                      {t.skill && (
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          t.skill === 'Speaking' 
                            ? 'bg-purple-100 text-purple-700'
                            : t.skill === 'Writing'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {t.skill}
                        </span>
                      )}
                      {t.testType && !t.skill && <span> - {t.testType}</span>}
                    </div>
                    {showProgress && (
                      <div className="text-lg font-bold text-blue-600 ml-2">
                        {t.percentage}%
                      </div>
                    )}
                  </div>
                  {showProgress && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${t.percentage}%`,
                          backgroundColor: t.percentage >= 80 ? '#22c55e' : t.percentage >= 60 ? '#3b82f6' : t.percentage >= 40 ? '#f59e0b' : '#ef4444'
                        }}
                      />
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    {t.takenAt && new Date(t.takenAt).toLocaleString("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                    })}
                    {t.createdAt && !t.takenAt && new Date(t.createdAt).toLocaleString("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                    })}{" "}
                    {t.isPublic !== undefined && (t.isPublic ? "• Public" : "• Private")}
                    {!showProgress && t.percentage && (
                      <span> • {t.percentage}%</span>
                    )}
                    {t.correctAnswers !== undefined && t.totalQuestions !== undefined && (
                      <span> • {t.correctAnswers}/{t.totalQuestions} correct</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {renderActions ? (
                    renderActions(t)
                  ) : (
                    <>
                      <Button size="sm" onClick={() => onOpen && onOpen(t.id)}>
                        Open
                      </Button>
                      {onDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(t.id, t.title)}
                          disabled={deleting === t.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </>
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
                  <div className="font-medium text-lg flex items-center gap-2">
                    <span>{t.title}</span>
                    {t.skill && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        t.skill === 'Speaking' 
                          ? 'bg-purple-100 text-purple-700'
                          : t.skill === 'Writing'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {t.skill}
                      </span>
                    )}
                    {t.testType && !t.skill && <span> - {t.testType}</span>}
                  </div>
                  {showProgress && (
                    <>
                      <div className="text-2xl font-bold text-blue-600 mt-2">
                        {t.percentage}%
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2 mb-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${t.percentage}%`,
                            backgroundColor: t.percentage >= 80 ? '#22c55e' : t.percentage >= 60 ? '#3b82f6' : t.percentage >= 40 ? '#f59e0b' : '#ef4444'
                          }}
                        />
                      </div>
                    </>
                  )}
                  <div className="text-sm text-muted-foreground mt-1">
                    {t.takenAt && new Date(t.takenAt).toLocaleString("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                    })}
                    {t.createdAt && !t.takenAt && new Date(t.createdAt).toLocaleString("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                    })}{" "}
                    {t.isPublic !== undefined && (t.isPublic ? "• Public" : "• Private")}
                    {!showProgress && t.percentage && (
                      <span> • {t.percentage}%</span>
                    )}
                    {t.correctAnswers !== undefined && t.totalQuestions !== undefined && (
                      <div className="mt-1">{t.correctAnswers}/{t.totalQuestions} correct</div>
                    )}
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    {renderActions ? (
                      renderActions(t)
                    ) : (
                      <>
                        <Button size="sm" onClick={() => onOpen && onOpen(t.id)}>
                          Open
                        </Button>
                        {onDelete && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(t.id, t.title)}
                            disabled={deleting === t.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </>
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
                  className="p-3 border rounded flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium truncate">
                        {t.title} - {t.testType}
                      </div>
                      {showProgress && (
                        <div className="text-lg font-bold text-blue-600 ml-2">
                          {t.percentage}%
                        </div>
                      )}
                    </div>
                    {showProgress && (
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${t.percentage}%`,
                            backgroundColor: t.percentage >= 80 ? '#22c55e' : t.percentage >= 60 ? '#3b82f6' : t.percentage >= 40 ? '#f59e0b' : '#ef4444'
                          }}
                        />
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground">
                      {new Date(t.takenAt).toLocaleString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                      })}{" "}
                      {t.isPublic ? "• Public" : "• Private"}
                      {!showProgress && t.percentage && (
                        <span> • {t.percentage}%</span>
                      )}
                      {t.correctAnswers !== undefined && t.totalQuestions !== undefined && (
                        <span> • {t.correctAnswers}/{t.totalQuestions} correct</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderActions ? (
                      renderActions(t)
                    ) : (
                      <>
                        <Button size="sm" onClick={() => onOpen && onOpen(t.id)}>
                          Open
                        </Button>
                        {onDelete && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(t.id, t.title)}
                            disabled={deleting === t.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </>
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
                      {t.title} - {t.testType}
                    </div>
                    {showProgress && (
                      <>
                        <div className="text-2xl font-bold text-blue-600 mt-2">
                          {t.percentage}%
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2 mb-2">
                          <div 
                            className="h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${t.percentage}%`,
                              backgroundColor: t.percentage >= 80 ? '#22c55e' : t.percentage >= 60 ? '#3b82f6' : t.percentage >= 40 ? '#f59e0b' : '#ef4444'
                            }}
                          />
                        </div>
                      </>
                    )}
                    <div className="text-sm text-muted-foreground mt-1">
                      {t.description || ""}
                      {!showProgress && t.percentage && (
                        <div className="mt-1">Score: {t.percentage}%</div>
                      )}
                      {t.correctAnswers !== undefined && t.totalQuestions !== undefined && (
                        <div className="mt-1">{t.correctAnswers}/{t.totalQuestions} correct</div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {t.isActive ? "Active" : "Inactive"} •{" "}
                      {t.isPublic ? "Public" : "Private"}
                    </div>
                    <div className="flex items-center gap-2">
                      {renderActions ? (
                        renderActions(t)
                      ) : (
                        <>
                          <Button
                            size="sm"
                            onClick={() => onOpen && onOpen(t.id)}
                          >
                            Open
                          </Button>
                          {onDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(t.id, t.title)}
                              disabled={deleting === t.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </>
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
