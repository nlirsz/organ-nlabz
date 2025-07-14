import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CategoryFilterProps {
  onCategoryChange: (category: string) => void;
  selectedCategory: string;
}

const defaultCategories = [
  'Geral', 'Casa', 'Roupas', 'Eletronicos', 'Games', 'Livros', 'Presentes'
];

export function CategoryFilter({ onCategoryChange, selectedCategory }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {defaultCategories.map((category) => (
        <Button
          key={category}
          variant={selectedCategory === category ? "default" : "outline"}
          onClick={() => onCategoryChange(category)}
          className="neomorphic-button px-4 py-2 rounded-lg font-medium transition-all duration-200"
          style={{
            backgroundColor: selectedCategory === category ? 'var(--primary-action)' : 'transparent',
            color: selectedCategory === category ? 'white' : 'var(--text-primary)',
            borderColor: selectedCategory === category ? 'var(--primary-action)' : 'var(--border-color)'
          }}
        >
          {category}
        </Button>
      ))}
    </div>
  );
}