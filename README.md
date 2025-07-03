# FimAI Chat

A modern, feature-rich AI chat application built with Next.js, supporting multiple AI providers and comprehensive user management.

## ✨ Features

### 🤖 Multi-Provider AI Support
- Support for multiple AI service providers (OpenAI, Claude, etc.)
- Custom model management with drag-and-drop reordering
- Model grouping and organization
- Real-time model availability checking via `/v1/models` API
- Automatic model icon matching and colorful UI

### 💬 Advanced Chat Interface
- Real-time streaming chat responses
- Markdown rendering with LaTeX formula support
- Message action buttons (copy, delete, edit)
- Chat history with AI-generated titles
- Per-message model recording
- Token usage tracking and display
- Clean, modern UI with consistent spacing

### 👥 Three-Tier User Management
- **Admin**: Full control panel access with hardcoded invite codes
- **User**: Invite code registration with token tracking and access code sharing
- **Guest**: Access code login with local storage and token counting

### 🔧 Configuration Management
- Intuitive config page for API settings
- Provider management with add/delete functionality
- Model configuration with custom parameters
- Collapsible sections with drag handles for reordering
- Batch AI renaming with smart formatting rules

### 🗄️ Database Integration
- SQLite database with Prisma ORM
- Conversation and message persistence
- User permissions and token usage tracking
- Migration from localStorage to database storage

### 🎨 UI/UX Features
- Black and white design aesthetic
- HTML5-style toast notifications
- Enhanced checkbox UI for model enable/disable
- Hierarchical dropdown model selection
- Responsive design for web and mobile

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd fim-ai-chat
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up the database:
```bash
npm run db:generate
npm run db:migrate
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   ├── chat/              # Chat interface
│   ├── config/            # Configuration page
│   └── login/             # Authentication
├── components/            # Reusable UI components
├── lib/                   # Utility functions and database
├── types/                 # TypeScript type definitions
└── styles/               # Global styles

prisma/
├── schema.prisma         # Database schema
└── seed.ts              # Database seeding
```

## 🛠️ Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with initial data
- `npm run db:studio` - Open Prisma Studio
- `npm run db:reset` - Reset database

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key"
```

### AI Provider Setup

1. Navigate to `/config` page
2. Add your AI providers with API keys
3. Configure available models
4. Set up user permissions and token limits

## 🏗️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: SQLite with Prisma ORM
- **Styling**: Tailwind CSS
- **UI Components**: Custom components with @lobehub/ui
- **Icons**: @lobehub/icons-static-svg
- **Markdown**: react-markdown with LaTeX support
- **Drag & Drop**: @dnd-kit
- **Authentication**: Custom user management system

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

If you encounter any issues or have questions, please open an issue on GitHub.
