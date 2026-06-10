import { describe, it } from 'vitest';

// Note: These tests will be updated once WeightService is implemented
describe('WeightService', () => {
  describe('create', () => {
    it.todo('should create a new weight record');

    it.todo('should validate weight is within range');
  });

  describe('findById', () => {
    it.todo('should return weight record by id');

    it.todo('should return null if record not found');

    it.todo('should not return record belonging to different user');
  });

  describe('findByUserId', () => {
    it.todo('should return all weight records for user');

    it.todo('should return records ordered by recordedAt descending');

    it.todo('should support date range filtering');
  });

  describe('update', () => {
    it.todo('should update weight record');

    it.todo('should update updatedAt timestamp');

    it.todo('should not update record belonging to different user');
  });

  describe('delete', () => {
    it.todo('should delete weight record');

    it.todo('should not delete record belonging to different user');
  });
});
