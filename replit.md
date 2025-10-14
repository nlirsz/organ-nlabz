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

## PostgreSQL Database Migration (January 16, 2025)
- Successfully migrated from MongoDB to PostgreSQL database
- Updated database schema with proper relations between users and products
- Implemented DatabaseStorage class to replace in-memory storage
- Created PostgreSQL tables using Drizzle ORM with proper foreign key relationships
- Updated authentication middleware to use PostgreSQL instead of MongoDB
- Maintained all existing functionality while switching to relational database
- Added proper database connection testing and error handling
- Successfully ran database migrations with `npm run db:push` command

## Migration Completion (January 16, 2025)
- Completed full migration from MongoDB to PostgreSQL
- Updated all API routes to use PostgreSQL storage interface
- Replaced MongoDB ObjectId with PostgreSQL integer IDs
- Updated JWT authentication to work with PostgreSQL user IDs
- Migrated all CRUD operations (Create, Read, Update, Delete) for products
- Preserved all existing functionality including user authentication and product management
- Testing confirmed: authentication, product listing, updates, and statistics all working correctly
- Successfully tested with sample data: 5 products for default user (ID: 1)
- All database operations now fully transactional and type-safe with Drizzle ORM

## Authentication System Fix (January 21, 2025)
- Fixed critical authentication inconsistency across components
- Standardized all authentication to use 'authToken' localStorage key and 'x-auth-token' header
- Fixed Histórico and Financeiro tabs data loading issues caused by authentication mismatch
- Updated payment modal to use consistent authentication pattern
- Resolved TypeScript type errors in storage interface and server routes
- Fixed hardcoded user ID issue in historico-tab (was using user '2' instead of current user '3')
- Added comprehensive debugging logs for authentication middleware
- Verified payment registration system working with product purchase marking

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

## Multi-Method Scraping System (January 16, 2025)
- Implemented robust multi-method scraping system with intelligent fallback mechanisms
- Added 4-layer scraping approach: extractProductInfo → HTML analysis → AI search → basic fallback
- Integrated ManualProductModal for user input when all scraping methods fail
- Enhanced error handling with specific feedback for different failure scenarios
- Added scrapingSuccess and needsManualInput flags for better user experience
- Created comprehensive fallback system that always returns usable product data
- Implemented smart retry logic with different AI models and approaches
- Added real-time user feedback during scraping process with progress indicators
- Enhanced URL input component with manual entry option and fallback integration
- Added detailed error logging and debugging for troubleshooting scraping issues

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
- Implemented intelligent price detection with priority-based selection
- Added specific price targeting system to avoid combo/total prices
- Created robust fallback system that guarantees essential data extraction

## Price Detection System Refinements (January 14, 2025)
- Implemented hierarchical price detection with 5 priority levels (0-4)
- Added specific price targeting for accurate individual product pricing
- Enhanced context analysis to avoid combo/bundle/total prices
- Created comprehensive logging system for debugging price selection
- Improved pattern matching for Brazilian e-commerce sites
- Added intelligent duplicate detection with 10% tolerance
- Implemented class-based priority system for main product prices

## Scraping System Improvements (October 14, 2025)
- **Image URL Normalization**: Fixed critical issue with relative and protocol-relative image URLs
  - Added `normalizeImageUrl()` function to convert all image URLs to absolute format
  - Supports: absolute (http://), protocol-relative (//cdn), relative (/) and relative without slash
  - Applied normalization across all extraction paths: JSON-LD, Gemini AI, and CSS selectors
- **JSON-LD Image Handling**: Added defensive extraction for Schema.org image variants
  - Handles string, array, and ImageObject formats per Schema.org specification
  - Safely extracts first image from arrays and .url property from objects
- **Product Name Validation**: Relaxed minimum length from 5 to 3 characters
  - Now accepts valid short product names like "PS5", "SSD", "RAM", "GPU"
  - Maintains filters for generic/invalid keywords
- **HTTP Success Validation**: Improved criteria for legitimate scraping results
  - Requires: valid name (≥3 chars) AND (price > 0 OR valid image)
  - Accepts absolute, protocol-relative, and relative image URLs
- **Product Update Endpoint**: Enhanced field handling for empty values
  - Empty string ("") converted to NULL in database (not 0 or removed)
  - NULL values properly displayed as empty in edit modal
  - Robust type conversion with parseFloat validation

The application follows a clean architecture pattern with clear separation between frontend, backend, and data layers, making it maintainable and scalable for future enhancements.