import React, { type ComponentType } from 'react';
import ErrorBoundary from './ErrorBoundary';

interface ErrorBoundaryOptions {
  /** Custom fallback UI */
  fallback?: React.ReactNode | ((error: Error, resetError: () => void) => React.ReactNode);
  /** Override the automatically-derived component name */
  name?: string;
}

/**
 * Higher-order component that wraps any component with an ErrorBoundary.
 * Automatically derives the component name from the wrapped component's
 * displayName or function name for better error logging.
 *
 * Usage:
 *   const SafeMyComponent = withErrorBoundary(MyComponent);
 *   // or with options:
 *   const SafeMyComponent = withErrorBoundary(MyComponent, { name: 'MyCustomName' });
 */
export default function withErrorBoundary<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: ErrorBoundaryOptions = {}
): ComponentType<P> {
  // Derive a sensible name from the wrapped component
  const componentName =
    options.name ||
    WrappedComponent.displayName ||
    WrappedComponent.name ||
    'AnonymousComponent';

  const WithErrorBoundary: ComponentType<P> = (props: P) => (
    <ErrorBoundary name={componentName} fallback={options.fallback}>
      <WrappedComponent {...(props as any)} />
    </ErrorBoundary>
  );

  // Preserve the original component's displayName for debugging
  WithErrorBoundary.displayName = `withErrorBoundary(${componentName})`;

  return WithErrorBoundary;
}
