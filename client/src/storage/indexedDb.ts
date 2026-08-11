import { CompletedRun, Source } from '../typing/types';

const DB_NAME = 'typetest';
const DB_VERSION = 1;

let _db: IDBDatabase | null = null;
let _available: boolean | null = null;

export async function isIDBAvailable(): Promise<boolean> {
    if (_available !== null) return _available;
    try { await openDB(); _available = true; }
    catch { _available = false; }
    return _available;
}

function openDB(): Promise<IDBDatabase> {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = e => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('runs')) db.createObjectStore('runs', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('sources')) db.createObjectStore('sources', { keyPath: 'id' });
        };
        req.onsuccess = e => { _db = (e.target as IDBOpenDBRequest).result; resolve(_db); };
        req.onerror = () => reject(req.error);
    });
}

function idbReq<T>(fn: (db: IDBDatabase) => IDBRequest<T>): Promise<T> {
    return openDB().then(db => new Promise<T>((resolve, reject) => {
        const req = fn(db);
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
    }));
}

export async function saveRun(run: CompletedRun): Promise<void> {
    if (!(await isIDBAvailable())) return;
    await idbReq(db => db.transaction('runs', 'readwrite').objectStore('runs').put(run));
}

export async function getRun(id: string): Promise<CompletedRun | undefined> {
    if (!(await isIDBAvailable())) return undefined;
    return idbReq<CompletedRun | undefined>(
        db => db.transaction('runs', 'readonly').objectStore('runs').get(id),
    );
}

export async function getAllRuns(): Promise<CompletedRun[]> {
    if (!(await isIDBAvailable())) return [];
    return idbReq<CompletedRun[]>(
        db => db.transaction('runs', 'readonly').objectStore('runs').getAll(),
    );
}

export async function saveSource(source: Source & { content: string }): Promise<void> {
    if (!(await isIDBAvailable())) return;
    await idbReq(db => db.transaction('sources', 'readwrite').objectStore('sources').put(source));
}

export async function getSourceContent(id: string): Promise<(Source & { content: string }) | undefined> {
    if (!(await isIDBAvailable())) return undefined;
    return idbReq<(Source & { content: string }) | undefined>(
        db => db.transaction('sources', 'readonly').objectStore('sources').get(id),
    );
}

export async function deleteSourceContent(id: string): Promise<void> {
    if (!(await isIDBAvailable())) return;
    await idbReq(db => db.transaction('sources', 'readwrite').objectStore('sources').delete(id));
}
