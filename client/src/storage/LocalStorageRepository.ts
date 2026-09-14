import { EntityId } from './dbSchema';
import { LocalStorageDataStore } from './LocalStorageDataStore';

export interface IRepository<T extends { id: EntityId }> {
  getAll(): T[];
  getById(id: EntityId): T | null;
  find(predicate: (item: T) => boolean): T[];
  findOne(predicate: (item: T) => boolean): T | null;
  create(item: Omit<T, 'id'> & { id?: EntityId }): T;
  update(id: EntityId, updates: Partial<T>): T | null;
  delete(id: EntityId): boolean;
  exists(predicate: (item: T) => boolean): boolean;
  count(predicate?: (item: T) => boolean): number;
}

export class LocalStorageRepository<T extends { id: EntityId }> implements IRepository<T> {
  constructor(private collectionKey: string) {}

  public getAll(): T[] {
    return LocalStorageDataStore.getCollection<T>(this.collectionKey);
  }

  public getById(id: EntityId): T | null {
    return LocalStorageDataStore.getById<T>(this.collectionKey, id);
  }

  public find(predicate: (item: T) => boolean): T[] {
    return this.getAll().filter(predicate);
  }

  public findOne(predicate: (item: T) => boolean): T | null {
    return this.getAll().find(predicate) || null;
  }

  public create(item: Omit<T, 'id'> & { id?: EntityId }): T {
    const finalItem: T = {
      ...item,
      id:
        item.id !== undefined && item.id !== null
          ? item.id
          : typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    } as T;

    return LocalStorageDataStore.insert<T>(this.collectionKey, finalItem, true);
  }

  public update(id: EntityId, updates: Partial<T>): T | null {
    return LocalStorageDataStore.update<T>(this.collectionKey, id, updates, true);
  }

  public delete(id: EntityId): boolean {
    return LocalStorageDataStore.delete(this.collectionKey, id, true);
  }

  public exists(predicate: (item: T) => boolean): boolean {
    return this.getAll().some(predicate);
  }

  public count(predicate?: (item: T) => boolean): number {
    if (!predicate) return this.getAll().length;
    return this.getAll().filter(predicate).length;
  }
}
