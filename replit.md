# Overview

This is a modern real-time chat application built with React and Express. The application features user authentication, friend management, chat rooms, and real-time messaging capabilities through WebSocket connections. It provides a social platform where users can connect with friends, join public chat rooms, and communicate in real-time with a clean, mobile-responsive interface.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client is built using React with TypeScript and follows a component-based architecture. The application uses shadcn/ui components for consistent UI elements and Tailwind CSS for styling. Key architectural decisions include:

- **Routing**: Uses wouter for lightweight client-side routing with protected routes for authenticated users
- **State Management**: React Query (@tanstack/react-query) handles server state management and caching, eliminating the need for complex state management libraries
- **Component Structure**: Modular component design with separate directories for UI components, user components, chat components, and friend management
- **Authentication Context**: Custom React context provider manages user authentication state across the application
- **WebSocket Integration**: Custom WebSocket context provider handles real-time communication features

## Backend Architecture
The server follows a REST API pattern with Express.js and implements real-time features through WebSocket connections:

- **Session-based Authentication**: Uses Passport.js with local strategy for user authentication, storing sessions in PostgreSQL
- **Database Layer**: Drizzle ORM provides type-safe database operations with a storage abstraction layer
- **WebSocket Server**: Integrated WebSocket server handles real-time messaging and user presence updates
- **Route Organization**: Modular route structure separating authentication, friends, chat rooms, and messaging endpoints

## Database Design
The application uses PostgreSQL with a relational schema designed for scalability:

- **User Management**: Users table with authentication credentials, profile information, and online status
- **Social Features**: Friendships table with status tracking (pending, accepted, blocked)
- **Chat System**: Separate tables for chat rooms, room memberships, and messages with proper foreign key relationships
- **Session Storage**: PostgreSQL-backed session store for authentication persistence

## Real-time Communication
WebSocket implementation enables instant messaging and presence updates:

- **Connection Management**: Automatic reconnection with exponential backoff for reliability
- **Message Broadcasting**: Real-time message delivery to connected users in chat rooms
- **Presence System**: Live online/offline status updates for friends and chat participants
- **Typing Indicators**: Real-time typing status for enhanced user experience

## UI/UX Design Patterns
The interface follows modern chat application conventions:

- **Mobile-first Design**: Responsive layout optimized for mobile devices with swipe navigation
- **Tab-based Navigation**: SwipeTabs component for easy navigation between friends, chat rooms, and other sections
- **Mini Profiles**: Modal overlays for quick user information and actions
- **Real-time Updates**: Live message updates and user status indicators

# External Dependencies

## Core Technologies
- **React 18**: Frontend framework with hooks and modern React patterns
- **Express.js**: Node.js web framework for the backend API
- **TypeScript**: Type safety across the entire application stack
- **Vite**: Build tool and development server with hot module replacement

## Database & ORM
- **PostgreSQL**: Primary database using Neon serverless PostgreSQL
- **Drizzle ORM**: Type-safe database operations with schema migrations
- **@neondatabase/serverless**: Serverless PostgreSQL client with WebSocket support

## Authentication & Sessions
- **Passport.js**: Authentication middleware with local strategy
- **express-session**: Session management with PostgreSQL session store
- **connect-pg-simple**: PostgreSQL session store adapter
- **crypto**: Built-in Node.js module for password hashing with scrypt

## Real-time Features
- **ws**: WebSocket library for real-time bidirectional communication
- **WebSocket**: Native browser WebSocket API for client-side connections

## UI Framework & Styling
- **shadcn/ui**: Component library built on Radix UI primitives
- **Radix UI**: Unstyled, accessible UI components
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Lucide React**: Icon library with consistent iconography

## Form Handling & Validation
- **React Hook Form**: Performant form library with minimal re-renders
- **Zod**: TypeScript-first schema validation
- **@hookform/resolvers**: Validation resolver for React Hook Form

## Development Tools
- **tsx**: TypeScript execution environment for development
- **esbuild**: Fast JavaScript bundler for production builds
- **Replit integrations**: Development environment optimizations for Replit