# Production Deployment Checklist

This checklist covers important items to verify before deploying your anonymous chat app to production.

## Configuration

- [ ] Verify all environment-specific configs are set correctly in `config/index.ts`
- [ ] Ensure production Supabase URL and API keys are correct
- [ ] Remove any hardcoded API keys or sensitive information
- [ ] Set appropriate log levels for production (error-only recommended)
- [ ] Configure appropriate cache expiry times

## Performance

- [ ] Implement message pagination for all chat rooms (using `pagination-utils.ts`)
- [ ] Add proper caching strategies for messages and rooms
- [ ] Optimize images and assets for production
- [ ] Test loading performance with large message history
- [ ] Verify memory usage doesn't grow excessively with usage

## Security

- [ ] Review and test all Supabase Row Level Security (RLS) policies
- [ ] Ensure all sensitive data is stored using `secure-storage.ts`
- [ ] Validate all user inputs to prevent injection attacks
- [ ] Implement proper authentication token handling
- [ ] Set up CORS policies on Supabase project

## Error Handling & Stability

- [ ] Ensure `GlobalErrorBoundary` is wrapping the entire application
- [ ] Test error scenarios to verify graceful recovery
- [ ] Add network status monitoring and offline handling
- [ ] Implement retry logic for critical API calls
- [ ] Add loading indicators for all asynchronous operations

## Testing

- [ ] Test on multiple device sizes and platforms
- [ ] Verify offline functionality works as expected
- [ ] Test slow network conditions using network throttling
- [ ] Check app behavior when switching between foreground/background
- [ ] Verify push notifications (if applicable)

## Analytics & Monitoring

- [ ] Set up error tracking (e.g., Sentry)
- [ ] Configure usage analytics (optional)
- [ ] Implement remote logging for production issues
- [ ] Set up monitoring for Supabase database and functions

## Code Cleanup

- [ ] Remove all development console.log statements
- [ ] Delete unused code and components
- [ ] Ensure no TODO comments remain in production code
- [ ] Update all dependencies to stable versions
- [ ] Fix any TypeScript/linting errors

## App Store Preparation

- [ ] Create appropriate app icons and splash screens
- [ ] Write compelling app store descriptions
- [ ] Prepare privacy policy document
- [ ] Create screenshots for various device sizes
- [ ] Set up proper app versioning

## Final Testing

- [ ] Perform a full end-to-end test of critical user flows
- [ ] Test all realtime subscription features
- [ ] Verify chat message delivery and notifications
- [ ] Test user authentication flows
- [ ] Check that unread counts and room access times work correctly

## Deployment

- [ ] Configure CI/CD pipeline if applicable
- [ ] Set up proper environment variables for build systems
- [ ] Create production build and test before submission
- [ ] Ensure database migrations are properly applied
- [ ] Document deployment process for future updates
