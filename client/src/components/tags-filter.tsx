
import React from 'react';
import { Tag, X, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface TagsFilterProps {
  availableTags: string[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  productsCount?: number;
}

export function TagsFilter({ 
  availableTags, 
  selectedTags, 
  onTagsChange, 
  productsCount = 0 
}: TagsFilterProps) {
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const clearAllTags = () => {
    onTagsChange([]);
  };

  if (availableTags.length === 0) {
    return (
      <div className="neomorphic-card p-4 rounded-xl text-center">
        <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Nenhuma tag encontrada
        </p>
      </div>
    );
  }

  return (
    <div className="neomorphic-card p-4 rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" style={{ color: 'var(--primary-action)' }} />
          <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>
            Filtrar por Tags
          </h3>
        </div>
        {selectedTags.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllTags}
            className="text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {selectedTags.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Filtros ativos ({productsCount} produtos):
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <Badge
                key={tag}
                variant="default"
                className="neomorphic-card cursor-pointer"
                onClick={() => toggleTag(tag)}
              >
                <Tag className="w-3 h-3 mr-1" />
                {tag}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Tags disponíveis:
        </p>
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => (
            <Badge
              key={tag}
              variant={selectedTags.includes(tag) ? "default" : "secondary"}
              className="neomorphic-card cursor-pointer hover:scale-105 transition-transform"
              onClick={() => toggleTag(tag)}
            >
              <Tag className="w-3 h-3 mr-1" />
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
