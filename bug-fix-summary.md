# Bug Fix Summary

## Bug 1: 租户隔离漏洞

| 项 | 内容 |
|---|---|
| **文件** | `src/common/utils/data-scope.service.ts` |
| **类** | `DataScopeService` |
| **方法** | `validateTenantConsistency(req, currentTenantId)` (新增) |
| **根因** | `TenantMiddleware` 从 JWT 解析 `tenantId` 后仅设置到 `request.tenantId`，未校验请求路径参数 `req.params.tenantId`、查询参数 `req.query.tenantId`、请求体 `req.body.tenantId` 是否与当前登录用户的 `tenantId` 一致。攻击者可在请求中携带其他租户的 `tenantId` 跨租户访问数据。 |
| **修复方式** | 在 `DataScopeService` 中新增 `validateTenantConsistency` 方法，逐一检查 `req.params.tenantId`、`req.query.tenantId`、`req.body.tenantId`，与 `currentTenantId` 不一致则抛出 `ForbiddenException(403)`。`TenantMiddleware` 在设置 `request.tenantId` 后、调用 `next()` 前调用该方法完成校验。 |

### 涉及改动

- `src/common/utils/data-scope.service.ts` — 新增 `validateTenantConsistency` 方法
- `src/common/middleware/tenant.middleware.ts` — 注入 `DataScopeService`，在主流程中调用校验，移除内联校验逻辑
- `src/common/middleware/tenant-middleware.module.ts` — 在 providers 中注册 `DataScopeService`

---

## Bug 2: 权限缓存未失效

| 项 | 内容 |
|---|---|
| **文件** | `src/common/guards/jwt-auth.guard.ts` |
| **类** | `JwtAuthGuard` |
| **方法** | `buildUserPayload(user)` (修改) |
| **文件** | `src/common/utils/permission-cache.service.ts` |
| **类** | `PermissionCacheService` (新增) |
| **文件** | `src/common/interceptors/operation-log.interceptor.ts` |
| **类** | `OperationLogInterceptor` |
| **方法** | `invalidatePermissionCache` / `handleRoleInvalidation` / `handlePermissionInvalidation` / `handleUserInvalidation` (新增) |
| **根因** | `JwtAuthGuard.buildUserPayload()` 每次请求都从数据库查询用户角色与权限，引入 Redis 缓存（key: `perm_cache:{userId}`，TTL 30min）后，角色/权限变更时无主动失效机制，只能等 TTL 自然过期，导致权限变更后仍用旧缓存判定。 |
| **修复方式** | 1. 新增 `PermissionCacheService`，提供 `getCachedUserPayload` / `setCachedUserPayload` / `invalidateUser` / `invalidateAll` 方法，在 `RedisModule` 中注册并导出。2. `JwtAuthGuard.buildUserPayload()` 先查 Redis 缓存，命中直接返回；未命中则查库并写入缓存。3. 在 `OperationLogInterceptor` 的 `tap` 回调中追加缓存失效逻辑：PUT/PATCH/DELETE `/api/roles/:id` → 查出该角色关联用户逐一失效；PUT/PATCH `/api/users/:id`（含 roleIds）→ 失效该用户；PUT/PATCH/DELETE `/api/permissions/:id` → 全量清空缓存。 |

### 涉及改动

- `src/common/utils/permission-cache.service.ts` — 新建，缓存读写 + 按用户/全量失效
- `src/common/redis/redis.service.ts` — 新增 `delByPattern(pattern)` 方法
- `src/common/redis/redis.module.ts` — 注册并导出 `PermissionCacheService`
- `src/common/guards/jwt-auth.guard.ts` — 注入 `PermissionCacheService`，`buildUserPayload` 加缓存读写
- `src/common/interceptors/operation-log.interceptor.ts` — 注入 `PermissionCacheService`，在 `tap` 中追加缓存失效逻辑

---

## Bug 3: 操作日志拦截器性能问题

| 项 | 内容 |
|---|---|
| **文件** | `src/common/interceptors/operation-log.interceptor.ts` |
| **类** | `OperationLogInterceptor` |
| **方法** | `saveLog(data)` (修改) |
| **根因** | `saveLog` 是 `async` 方法，内部 `await prismaService.operationLog.create()` 同步等待数据库写入完成，每次写操作请求额外阻塞约 50ms+，直接抬高接口 RT。 |
| **修复方式** | 将 `saveLog` 从 `async` 改为 fire-and-forget 模式：用 `setImmediate(async () => { ... })` 将数据库写入调度到下一个事件循环迭代，主流程不等待；写失败仅 `console.error`，不影响业务响应。 |

### 涉及改动

- `src/common/interceptors/operation-log.interceptor.ts` — `saveLog` 方法改为 `setImmediate` 异步 fire-and-forget
