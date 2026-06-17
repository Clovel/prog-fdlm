'use client';

/* Framework imports ----------------------------------- */
import React, { useState } from 'react';

/* Module imports -------------------------------------- */
import { cn } from 'lib/utils';
import { isDefaultFilters } from 'helpers/applyEventFilters';

/* Component imports ----------------------------------- */
import { Search, X, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Input } from 'components/ui/input';
import { Button } from 'components/ui/button';
import { Badge } from 'components/ui/badge';
import { Switch } from 'components/ui/switch';
import { Label } from 'components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from 'components/ui/dialog';

/* Type imports ---------------------------------------- */
import type { FilterState, SortField, SortDir } from 'helpers/applyEventFilters';

/* Local constants ------------------------------------- */
const SORT_FIELDS: Array<{ value: SortField; label: string }> = [
  { value: 'none', label: 'Aucun' },
  { value: 'start', label: 'Début' },
  { value: 'end', label: 'Fin' },
  { value: 'favorites', label: 'Favoris' },
];

const SORT_DIRS: Array<{ value: SortDir; label: string }> = [
  { value: 'asc', label: 'Croissant' },
  { value: 'desc', label: 'Décroissant' },
];

/* EditionEventsFilterTool component prop types -------- */
interface EditionEventsFilterToolProps {
  filters: FilterState;
  feteDeLaMusiqueDay: Date;
  now: Date;
  onChange: (next: FilterState) => void;
  onReset: () => void;
  activeCount: number;
  resultCount: number;
}

/* EditionEventsFilterTool component ------------------- */
const EditionEventsFilterTool: React.FC<EditionEventsFilterToolProps> = (
  {
    filters,
    feteDeLaMusiqueDay,
    now,
    onChange,
    onReset,
    activeCount,
    resultCount,
  },
) => {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  const showReset: boolean = !isDefaultFilters(filters, feteDeLaMusiqueDay, now);
  const hasSearch: boolean = filters.search.length > 0;
  const sortDisabled: boolean = filters.sortField === 'none';

  return (
    <section className="w-full max-w-screen lg:max-w-5xl px-2 mx-auto lg:px-0 py-3">
      <div className="flex items-center gap-2">
        {/* Search (clear ✕ sits inside so the row height stays h-9) */}
        <div className="relative flex-1 min-w-0">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            inputMode="search"
            placeholder="Rechercher un concert, un artiste, un lieu…"
            aria-label="Rechercher un événement"
            value={filters.search}
            onChange={
              (event: React.ChangeEvent<HTMLInputElement>): void => {
                onChange({ ...filters, search: event.target.value });
              }
            }
            className="h-9 pl-8 pr-8 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {
            hasSearch &&
              <button
                type="button"
                aria-label="Effacer la recherche"
                onClick={
                  (): void => {
                    onChange({ ...filters, search: '' });
                  }
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
          }
        </div>

        {/* Bar-level reset — only when state differs from defaults */}
        {
          showReset &&
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Réinitialiser les filtres"
              title="Réinitialiser"
              onClick={onReset}
              className="shrink-0"
            >
              <RotateCcw className="size-4" />
            </Button>
        }

        {/* Filtres & tri trigger */}
        <Button
          type="button"
          variant="outline"
          aria-label="Filtres & tri"
          onClick={
            (): void => {
              setDialogOpen(true);
            }
          }
          className="shrink-0"
        >
          <SlidersHorizontal className="size-4" />
          <span className="hidden sm:inline">Filtres &amp; tri</span>
          {
            activeCount > 0 &&
              <Badge variant="secondary" className="ml-1 px-1.5">
                {activeCount}
              </Badge>
          }
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className={cn(
            'flex flex-col gap-0 p-0',
            'max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:w-full max-sm:max-w-full',
            'max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:border-0',
          )}
        >
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle>Filtres &amp; tri</DialogTitle>
          </DialogHeader>

          <div className="flex flex-1 flex-col gap-6 overflow-auto px-4 py-4">
            {/* Affichage */}
            <div className="flex flex-col gap-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Affichage
              </p>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="filter-day-only" className="flex flex-col items-start gap-0.5">
                  <span>Uniquement la nuit du 21 juin</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    Masque les autres dates
                  </span>
                </Label>
                <Switch
                  id="filter-day-only"
                  checked={filters.dayOnly}
                  onCheckedChange={
                    (checked: boolean): void => {
                      onChange({ ...filters, dayOnly: checked });
                    }
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="filter-hide-past" className="flex flex-col items-start gap-0.5">
                  <span>Masquer les événements passés</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    Déjà terminés
                  </span>
                </Label>
                <Switch
                  id="filter-hide-past"
                  checked={filters.hidePast}
                  onCheckedChange={
                    (checked: boolean): void => {
                      onChange({ ...filters, hidePast: checked });
                    }
                  }
                />
              </div>
            </div>

            {/* Trier par */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Trier par
              </p>
              <div className="flex flex-wrap gap-2">
                {
                  SORT_FIELDS.map(
                    (field): React.ReactNode => (
                      <Button
                        key={field.value}
                        type="button"
                        size="sm"
                        variant={filters.sortField === field.value ? 'default' : 'outline'}
                        onClick={
                          (): void => {
                            onChange({ ...filters, sortField: field.value });
                          }
                        }
                      >
                        {field.label}
                      </Button>
                    ),
                  )
                }
              </div>
              <div className="flex flex-wrap gap-2">
                {
                  SORT_DIRS.map(
                    (dir): React.ReactNode => (
                      <Button
                        key={dir.value}
                        type="button"
                        size="sm"
                        disabled={sortDisabled}
                        variant={filters.sortDir === dir.value ? 'default' : 'outline'}
                        onClick={
                          (): void => {
                            onChange({ ...filters, sortDir: dir.value });
                          }
                        }
                      >
                        {dir.label}
                      </Button>
                    ),
                  )
                }
              </div>
            </div>
          </div>

          <DialogFooter className="border-t px-4 py-3">
            <Button type="button" variant="ghost" onClick={onReset}>
              Réinitialiser
            </Button>
            <Button
              type="button"
              onClick={
                (): void => {
                  setDialogOpen(false);
                }
              }
            >
              {`Voir ${resultCount} résultat${resultCount !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

/* Export EditionEventsFilterTool component ------------ */
export default EditionEventsFilterTool;
