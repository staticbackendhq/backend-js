# StaticBackend JavaScript Library

A lightweight client library for StaticBackend API.

## Installation & Setup

```typescript
import { Backend } from '@staticbackend/js';

const backend = new Backend('your-public-key', 'na1'); // or 'dev' for localhost
```

Region options: `'na1'`, `'dev'` (localhost:8099), or custom URL.

## Response Pattern

All async methods return: `{ok: boolean, content: any}`

**Standard usage pattern:**
```typescript
const res = await backend.someMethod();
if (!res.ok) {
  // Handle error - res.content contains error message as string
  console.error(res.content);
  return;
}
// Happy path - res.content contains the result
const data = res.content;
```

## Authentication

```typescript
// Register - returns token string
const res = await backend.register(email, password);
const token = res.content; // string token

// Login - returns token string
const res = await backend.login(email, password);
const token = res.content; // string token

// Get current user
const res = await backend.me(token);
const user = res.content;
```

## Account Management

```typescript
// List all users in account
await backend.users(token);

// Add user to account
await backend.addUser(token, email, password);

// Remove user from account
await backend.removeUser(token, userId);
```

## Database Operations

All database operations require a `token` and `repo` (collection name).

### Create
```typescript
await backend.create(token, 'tasks', { title: 'Task 1' });
await backend.createBulk(token, 'tasks', [{ title: 'Task 1' }, { title: 'Task 2' }]);
```

### Read
```typescript
// List all - returns {page: number, size: number, total: number, data: Array<T>}
const res = await backend.list(token, 'tasks');
const { page, size, total, data } = res.content;

// Get by ID
await backend.getById(token, 'tasks', 'doc-id');

// Query with filters - returns {page: number, size: number, total: number, data: Array<T>}
const filters = { field: 'value' };
const res = await backend.query(token, 'tasks', filters);
const { page, size, total, data } = res.content;

// Search
await backend.search(token, 'tasks', 'keywords');

// Count
await backend.count(token, 'tasks', filters);
```

### Update
```typescript
await backend.update(token, 'tasks', 'doc-id', { title: 'Updated' });

// Bulk update
const bulkData = {
  update: { status: 'completed' },
  clauses: [[['field', '==', 'value']]]
};
await backend.updateBulk(token, 'tasks', bulkData);
```

### Delete
```typescript
await backend.delete(token, 'tasks', 'doc-id');
await backend.deleteBulk(token, 'tasks', filters);
```

## File Storage

```typescript
// Upload file
await backend.storeFile(token, formElement);

// Resize image
await backend.resizeImage(token, 800, formElement);
```

## Real-time & Messaging

```typescript
// Publish message to channel
await backend.publish(token, 'channel-name', 'message-type', { data: 'value' });

// WebSocket connection
backend.connectWS(token,
  (tok) => { /* onAuth callback */ },
  (payload) => { /* onMessage callback */ }
);
backend.sendWS('message-type', 'data', 'channel');

// SSE connection
backend.connect(token,
  (tok) => { /* onAuth callback */ },
  (payload) => { /* onMessage callback */ }
);
backend.send('message-type', 'data', 'channel');
```

## Other Features

```typescript
// Convert URL to PDF
await backend.convertURLToX(token, {
  toPDF: true,
  url: 'https://example.com',
  fullpage: true
});

// Social login (opens popup)
const user = await backend.socialLogin('google'); // 'twitter' | 'google' | 'facebook'
// Returns ExternalUser: {token, email, name, first, last, avatarUrl}
```

## TypeScript Interfaces

```typescript
interface Payload {
  sid: string;
  type: string;
  data: string;
  channel: string;
  token: string;
}

interface BulkUpdate {
  update: any;
  clauses: Array<Array<any>>;
}

interface ConvertData {
  toPDF: boolean;
  url: string;
  fullpage: boolean;
}

interface ExternalUser {
  token: string;
  email: string;
  name: string;
  first: string;
  last: string;
  avatarUrl: string;
}
```
