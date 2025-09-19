# Contributing to Amala Discovery Platform 🍽️

Thank you for your interest in contributing to the Amala Discovery Platform! This document provides guidelines and information for contributors.

## 🎯 Project Overview

The Amala Discovery Platform is a crowdsourced global map for discovering and verifying authentic Amala restaurants. We welcome contributions from developers, designers, content creators, and Amala enthusiasts worldwide.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase account
- Google Cloud account (for Maps API)
- Google AI Studio account (for Gemini API)

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/amala-hack.git
   cd amala-hack
   npm install
   ```

2. **Environment Setup**
   - Copy `.env.example` to `.env.local`
   - Fill in your Firebase, Google Maps, and Gemini API credentials
   - See README.md for detailed environment variable descriptions

3. **Database Setup**
   - Deploy Firestore security rules: `firebase deploy --only firestore:rules,storage`
   - Ensure proper indexes are created

4. **Start Development**
   ```bash
   npm run dev
   ```

## 🛠️ Development Guidelines

### Code Style

- **TypeScript**: All new code should be written in TypeScript
- **ESLint**: Follow the existing ESLint configuration
- **Prettier**: Code formatting is handled automatically
- **Naming**: Use descriptive names for variables, functions, and components

### Component Structure

```typescript
// Example component structure
"use client";

import React from "react";
import { ComponentProps } from "@/types";

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  return (
    <div className="component-container">
      <h2>{title}</h2>
      <button onClick={onAction} aria-label="Perform action">
        Action
      </button>
    </div>
  );
}
```

### Accessibility Requirements

- **ARIA Labels**: All interactive elements must have proper ARIA labels
- **Keyboard Navigation**: Ensure all functionality is keyboard accessible
- **Focus Management**: Visible focus indicators required
- **Semantic HTML**: Use proper HTML5 semantic elements
- **Screen Reader**: Test with screen readers when possible

### API Development

- **Validation**: Use Zod schemas for all API input validation
- **Error Handling**: Provide meaningful error messages
- **Rate Limiting**: Implement appropriate rate limits
- **Authentication**: Protect endpoints that require authentication
- **Documentation**: Document API endpoints with examples

## 🎨 Design Guidelines

### UI/UX Principles

- **Mobile First**: Design for mobile, enhance for desktop
- **Accessibility**: Follow WCAG 2.1 AA guidelines
- **Performance**: Optimize for fast loading and smooth interactions
- **Consistency**: Use the existing design system and components

### Color Palette

- Primary: `#059669` (Green)
- Secondary: `#3B82F6` (Blue)
- Success: `#10B981` (Emerald)
- Warning: `#F59E0B` (Amber)
- Error: `#EF4444` (Red)
- Gray Scale: Tailwind CSS gray palette

## 🧪 Testing

### Testing Requirements

- **Unit Tests**: Write tests for utility functions and business logic
- **Component Tests**: Test React components with React Testing Library
- **API Tests**: Test API endpoints with proper mocking
- **Accessibility Tests**: Include accessibility testing in component tests

### Running Tests

```bash
npm test                 # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report
```

## 📝 Commit Guidelines

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(discovery): add regional batching for autonomous discovery

- Implement regional search queries for Americas, Europe, Africa, Asia-Pacific
- Add country-specific search terms for better location discovery
- Include rate limiting and error handling for API calls

Closes #123
```

## 🔄 Pull Request Process

### Before Submitting

1. **Branch**: Create a feature branch from `main`
2. **Code**: Write clean, well-documented code
3. **Tests**: Add tests for new functionality
4. **Lint**: Ensure code passes linting
5. **Build**: Verify the application builds successfully

### PR Requirements

- **Description**: Provide a clear description of changes
- **Screenshots**: Include screenshots for UI changes
- **Testing**: Describe how the changes were tested
- **Breaking Changes**: Clearly document any breaking changes
- **Issue Reference**: Link to related issues

### Review Process

1. **Automated Checks**: All CI checks must pass
2. **Code Review**: At least one maintainer review required
3. **Testing**: Manual testing by reviewers
4. **Approval**: PR approved by maintainer
5. **Merge**: Squash and merge to main branch

## 🌍 Internationalization

### Adding New Languages

1. **Translation Files**: Add new locale files in `/locales`
2. **Components**: Use the translation hooks in components
3. **Testing**: Test with different locales
4. **Documentation**: Update language support documentation

### Translation Guidelines

- **Context**: Provide context for translators
- **Pluralization**: Handle plural forms correctly
- **Cultural Sensitivity**: Be mindful of cultural differences
- **Food Terms**: Preserve authentic food terminology

## 🚨 Security Guidelines

### Security Best Practices

- **Input Validation**: Validate all user inputs
- **Authentication**: Properly implement authentication checks
- **Authorization**: Verify user permissions for actions
- **Data Sanitization**: Sanitize data before database operations
- **API Keys**: Never commit API keys or secrets

### Reporting Security Issues

Please report security vulnerabilities privately to the maintainers. Do not create public issues for security problems.

## 📊 Analytics and Privacy

### Data Collection

- **User Privacy**: Respect user privacy and data protection laws
- **Minimal Data**: Collect only necessary data
- **Transparency**: Be transparent about data collection
- **Consent**: Obtain proper consent for data collection

## 🤝 Community Guidelines

### Code of Conduct

- **Respectful**: Be respectful and inclusive
- **Constructive**: Provide constructive feedback
- **Collaborative**: Work together towards common goals
- **Learning**: Help others learn and grow

### Communication

- **Issues**: Use GitHub issues for bug reports and feature requests
- **Discussions**: Use GitHub discussions for general questions
- **Discord**: Join our Discord for real-time chat (if available)

## 🏆 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- Annual contributor highlights

## 📚 Resources

### Documentation

- [README.md](./README.md) - Project overview and setup
- [API Documentation](./docs/api.md) - API reference
- [Component Library](./docs/components.md) - UI component guide

### External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

## ❓ Questions?

If you have questions about contributing, please:

1. Check existing documentation
2. Search existing issues and discussions
3. Create a new discussion or issue
4. Reach out to maintainers

Thank you for contributing to the Amala Discovery Platform! 🙏

---

**Happy Coding!** 🚀
