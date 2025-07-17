
import React, { useState, KeyboardEvent } from 'react';
import { X, Plus, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface TagsInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  suggestions?: string[];
}

export function TagsInput({ 
  tags, 
  onTagsChange, 
  placeholder = "Adicionar tag...",
  maxTags = 10,
  suggestions = []
}: TagsInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = suggestions.filter(
    suggestion => 
      suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
      !tags.includes(suggestion)
  );

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < maxTags) {
      onTagsChange([...tags, trimmedTag]);
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, index) => (
          <Badge key={index} variant="secondary" className="neomorphic-card px-3 py-1">
            <Tag className="w-3 h-3 mr-1" />
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-2 hover:text-red-500"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>

      <div className="relative">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={tags.length < maxTags ? placeholder : `Máximo ${maxTags} tags`}
            disabled={tags.length >= maxTags}
            className="neomorphic-input"
          />
          <Button
            type="button"
            onClick={() => addTag(inputValue)}
            disabled={!inputValue.trim() || tags.length >= maxTags}
            className="neomorphic-button"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Sugestões */}
        {showSuggestions && filteredSuggestions.length > 0 && inputValue && (
          <div className="absolute z-10 w-full mt-1 neomorphic-card border rounded-lg shadow-lg max-h-32 overflow-y-auto">
            {filteredSuggestions.slice(0, 5).map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => addTag(suggestion)}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                style={{ color: 'var(--text-primary)' }}
              >
                <Tag className="w-3 h-3 mr-2 inline" />
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        {tags.length}/{maxTags} tags
      </div>
    </div>
  );
}
