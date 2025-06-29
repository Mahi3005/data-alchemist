# Data Alchemist 🧪

An AI-powered Next.js web application that transforms messy CSV/XLSX spreadsheets into clean, validated datasets with rule-based configuration and natural language interaction.

## ✨ Features

- **📊 Multi-format Support**: Handle both CSV and XLSX files seamlessly
- **🤖 AI-Powered Cleaning**: Use natural language to describe data cleaning rules
- **⚡ Real-time Validation**: Instant feedback on data quality and consistency
- **🎯 Rule-based Configuration**: Define custom validation and transformation rules
- **🔄 Interactive Processing**: Step-by-step data transformation with preview
- **📱 Modern UI**: Built with Next.js for a responsive, fast user experience
- **🎨 Smart Formatting**: Automatic detection and correction of common data issues

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Mahi3005/data-alchemist.git
   cd data-alchemist
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

4. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application running.

## 📖 How to Use

### Basic Workflow

1. **Upload Your File**: Drag and drop or select your CSV/XLSX file
2. **Preview Data**: Review your data structure and identify issues
3. **Set Rules**: Define cleaning and validation rules using natural language or predefined options
4. **Transform**: Apply transformations and see real-time previews
5. **Validate**: Check data quality and fix any remaining issues
6. **Export**: Download your cleaned dataset

### Example Use Cases

- **Remove duplicates** from customer databases
- **Standardize formats** for dates, phone numbers, and addresses
- **Validate data types** and catch inconsistencies
- **Clean text data** by trimming whitespace and fixing case issues
- **Handle missing values** with intelligent defaults or interpolation

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **File Processing**: SheetJS (xlsx), PapaParse (CSV)
- **UI Components**: Radix UI, Lucide Icons
- **Fonts**: Geist (optimized with next/font)

## 🏗️ Project Structure

```
data-alchemist/
├── app/                    # Next.js app directory
│   ├── components/         # Reusable UI components
│   ├── lib/               # Utility functions and configurations
│   ├── api/               # API routes
│   └── page.tsx           # Main application page
├── public/                # Static assets
├── styles/                # Global styles
└── types/                 # TypeScript type definitions
```

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Add your environment variables here
NEXT_PUBLIC_APP_NAME=Data Alchemist
```

### Customization

- **Validation Rules**: Extend the rule engine in `lib/validation.ts`
- **File Parsers**: Add support for new formats in `lib/parsers.ts`
- **UI Themes**: Customize the design system in `tailwind.config.js`

## 📊 Supported Data Operations

### Data Cleaning
- Remove duplicate rows
- Trim whitespace
- Standardize text case
- Fix encoding issues
- Handle special characters

### Data Validation
- Type checking (string, number, date, email, etc.)
- Range validation
- Pattern matching (regex)
- Required field validation
- Custom validation rules

### Data Transformation
- Date format standardization
- Number formatting
- Text transformations
- Column mapping and renaming
- Data type conversions

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style and conventions
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Bug Reports & Feature Requests

Found a bug or have a feature request? Please open an issue on [GitHub Issues](https://github.com/Mahi3005/data-alchemist/issues).

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/) and [Vercel](https://vercel.com/)
- File processing powered by [SheetJS](https://sheetjs.com/) and [PapaParse](https://www.papaparse.com/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Icons by [Lucide](https://lucide.dev/)

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - Interactive Next.js tutorial
- [Next.js GitHub Repository](https://github.com/vercel/next.js) - Your feedback and contributions are welcome!

## 🚀 Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

<div align="center">
  <strong>Transform your messy data into gold with Data Alchemist! ✨</strong>
</div>
