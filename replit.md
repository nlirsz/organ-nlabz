# Smart Shopping List Application

## Overview

This is a full-stack shopping list application built with React, Express, and PostgreSQL. The application allows users to add products to their shopping list by pasting product URLs, which are then scraped and processed using OpenAI's GPT-4 to extract product information automatically. The application features a modern neumorphic design with Brazilian Portuguese interface.

## User Preferences

Preferred communication style: Simple, everyday language.
Design style: Neumorphic design with modern card-based layout
Language: Brazilian Portuguese for user interface
Currency: Brazilian Real (BRL)

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **UI Library**: Radix UI components with shadcn/ui styling
- **Styling**: Tailwind CSS with custom neumorphic design tokens and CSS variables
- **Design System**: Neumorphic design with Inter, Almarai, and Space Grotesk fonts
- **Theme**: Light/dark mode support with CSS custom properties
- **State Management**: TanStack Query for server state, React hooks for local state
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Currently using in-memory storage (planned for JWT)
- **API Integration**: OpenAI GPT-4 for product information extraction
- **Web Scraping**: Custom scraping service using fetch with OpenAI analysis

### Database Schema
- **Users Table**: Basic user management with username/password
- **Products Table**: Complete product information including URL, name, price, images, store, and purchase status
- **Schema Management**: Drizzle ORM with PostgreSQL dialect

## Key Components

### Data Layer
- **Drizzle ORM**: Type-safe database operations with PostgreSQL
- **Schema Definition**: Centralized in `shared/schema.ts` for type consistency
- **Storage Interface**: Abstract storage interface with in-memory implementation for development

### API Layer
- **Product Management**: CRUD operations for products
- **Web Scraping**: URL-based product information extraction
- **Statistics**: Product and shopping list analytics

### Frontend Components
- **Product Cards**: Interactive product display with purchase tracking
- **URL Input**: Product URL submission with validation
- **Shopping List**: Organized product management interface
- **Statistics Dashboard**: Real-time shopping metrics

### External Integrations
- **Gemini AI**: Intelligent product information extraction from HTML with automatic categorization
- **Web Scraping**: Custom fetch-based scraping with user agent spoofing
- **URL Verification**: Pre-scraping URL validation endpoint

## Data Flow

1. **Product Addition**: User submits product URL → Backend scrapes webpage → OpenAI extracts product info → Data stored in PostgreSQL → Frontend updates
2. **Product Management**: User actions (purchase, delete, edit) → API updates → Database persistence → Real-time UI updates
3. **Statistics**: Database aggregation → API endpoint → Frontend display

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL connection for serverless environments
- **drizzle-orm**: Type-safe database operations
- **OpenAI**: GPT-4 API for product information extraction
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Comprehensive UI component library

### Development Tools
- **Vite**: Fast development server and build tool
- **TypeScript**: Type safety across the entire stack
- **Tailwind CSS**: Utility-first styling framework
- **ESBuild**: Fast JavaScript bundling for production

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds React app to `dist/public`
- **Backend**: ESBuild bundles Express server to `dist/index.js`
- **Database**: Drizzle migrations managed via `drizzle-kit`

### Environment Configuration
- **Development**: Local development with Vite dev server
- **Production**: Node.js server serving static files and API
- **Database**: PostgreSQL with connection via `DATABASE_URL`

### Key Features
- **Tab-based Navigation**: Organized interface with 5 main sections with distinct colors
- **Automatic Product Detection**: AI-powered product information extraction with Gemini
- **Category System**: Automatic product categorization with filtering and icons
- **Advanced Search**: Search by product name, store, and description
- **Financial Dashboard**: Comprehensive spending analysis by category and store
- **Purchase History**: Track all bought products with detailed analytics
- **Real-time Updates**: Immediate UI feedback for all operations
- **Neumorphic Design**: Modern 3D-style interface with soft shadows and depth
- **Dark/Light Theme**: Toggle between themes with smooth transitions
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Type Safety**: End-to-end TypeScript for reliability
- **Brazilian Localization**: Portuguese interface with BRL currency formatting
- **Interactive Cards**: Product cards with hover effects and category tags
- **User-based Filtering**: Each user sees only their own products
- **Sorting Options**: Sort products by name, price, or date added
- **Enhanced Price Detection**: Improved AI system for Brazilian price formats

## Recent Changes (January 14, 2025)
- Implemented tab-based navigation system (Dashboard Principal, Produtos, Add Produtos, Histórico de Compra, Financeiro)
- Enhanced Gemini AI integration with automatic product categorization
- Added comprehensive category filtering system (Geral, Casa, Roupas, Eletronicos, Games, Livros, Presentes)
- Created dedicated tabs for different functionality areas:
  - Dashboard: Overview with stats and recent products
  - Produtos: Product list with category filters
  - Add Produtos: URL input with instructions and supported stores
  - Histórico: Purchase history with spending analysis
  - Financeiro: Financial dashboard with category and store breakdowns
- Improved product data model with additional fields (category, brand, tags, priority, notes)
- Added URL verification endpoint before product scraping
- Implemented sample products for testing with different categories
- Fixed product display issues in tabbed interface
- Maintained neumorphic design system with CSS custom properties
- Enhanced Brazilian Portuguese localization for all UI text
- Added BRL currency formatting throughout the application

## Latest Improvements (Same Day)
- Implemented user-based product filtering system (each user sees only their own products)
- Added colorful tab navigation with distinct colors for each tab (blue, green, orange, purple, red)
- Enhanced category filters with icons and colors for better visual distinction
- Improved Gemini AI price extraction with more robust Brazilian price detection
- Added advanced search functionality with product name, store, and description search
- Implemented sorting options (by name, price, date) with visual feedback
- Enhanced product card design with better category display and pricing information
- Added animated transitions and hover effects throughout the interface
- Improved error handling and fallback systems for price extraction
- Enhanced tooltip and user feedback systems

## Scraping System Improvements (January 14, 2025)
- Implemented dual-method scraping approach with HTML analysis and AI search fallback
- Enhanced Brazilian price format detection (R$ 1.234,56 → 1234.56)
- Added robust JSON parsing with markdown cleanup for Gemini responses
- Improved normalizePrice function with intelligent decimal/thousands separator detection
- Added comprehensive error handling and logging for debugging
- Reduced HTML content size (200k → 100k characters) for faster processing
- Optimized Gemini configuration with lower temperature and token limits
- Fixed price conversion issues that were causing incorrect values (R$ 4.941,00 → 4941.00)
- Added automatic store name extraction from URLs
- Enhanced category mapping system for consistent product classification

The application follows a clean architecture pattern with clear separation between frontend, backend, and data layers, making it maintainable and scalable for future enhancements.