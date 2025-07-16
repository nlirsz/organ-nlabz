import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Grid3X3, 
  Home, 
  Shirt, 
  Smartphone, 
  Gamepad2, 
  BookOpen, 
  Gift 
} from "lucide-react";

interface CategoryFilterProps {
  onCategoryChange: (category: string) => void;
  selectedCategory: string;
}

const defaultCategories = [
  { name: 'Geral', icon: Grid3X3, color: '#6b7280' },
  { name: 'Casa', icon: Home, color: '#059669' },
  { name: 'Roupas', icon: Shirt, color: '#dc2626' },
  { name: 'Eletronicos', icon: Smartphone, color: '#2563eb' },
  { name: 'Games', icon: Gamepad2, color: '#7c3aed' },
  { name: 'Livros', icon: BookOpen, color: '#ca8a04' },
  { name: 'Presentes', icon: Gift, color: '#db2777' }
];

export function CategoryFilter({ onCategoryChange, selectedCategory }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {defaultCategories.map((category) => {
        const Icon = category.icon;
        const isSelected = selectedCategory === category.name;

        return (
          <Button
            key={category.name}
            variant={isSelected ? "default" : "outline"}
            onClick={() => onCategoryChange(category.name === 'Geral' ? 'Geral' : category.name)}
            className="neomorphic-button px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
            style={{
              backgroundColor: isSelected ? category.color : 'transparent',
              color: isSelected ? 'white' : 'var(--text-primary)',
              borderColor: isSelected ? category.color : 'var(--border-color)',
              transform: isSelected ? 'scale(0.95)' : 'scale(1)',
              boxShadow: isSelected 
                ? `inset 2px 2px 4px rgba(0,0,0,0.2), inset -2px -2px 4px rgba(255,255,255,0.1)`
                : 'var(--shadow)'
            }}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{category.name}</span>
          </Button>
        );
      })}
    </div>
  );
}