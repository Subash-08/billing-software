import { describe, it, expect } from 'vitest';
import { ApplicationError, ValidationError, AuthorizationError } from './errors';

describe('Application Errors Hierarchy', () => {
  it('should instantiate ApplicationError correctly', () => {
    const err = new ApplicationError('Something went wrong', 'TEST_ERROR', 500);
    expect(err.message).toBe('Something went wrong');
    expect(err.code).toBe('TEST_ERROR');
    expect(err.statusCode).toBe(500);
  });

  it('should instantiate ValidationError with 400 status', () => {
    const err = new ValidationError('Invalid input payload', { field: 'email' });
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.details).toEqual({ field: 'email' });
  });

  it('should instantiate AuthorizationError with 403 status', () => {
    const err = new AuthorizationError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('AUTHORIZATION_ERROR');
  });
});
