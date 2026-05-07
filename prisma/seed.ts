import { PrismaClient, PermissionType, DataScope } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  const defaultTenant = await prisma.tenant.upsert({
    where: { code: 'default' },
    update: {},
    create: {
      name: '默认租户',
      code: 'default',
      description: '系统默认租户',
      config: {
        maxUsers: 1000,
        modules: {
          userManagement: true,
          roleManagement: true,
          permissionManagement: true,
          departmentManagement: true,
          operationLog: true,
        },
      },
      isEnabled: true,
    },
  });

  console.log('Created tenant:', defaultTenant.code);

  const defaultDept = await prisma.department.upsert({
    where: { id: 'default-dept' },
    update: {},
    create: {
      id: 'default-dept',
      name: '总公司',
      code: 'HQ',
      tenantId: defaultTenant.id,
      parentId: null,
      sort: 1,
      description: '总公司',
    },
  });

  console.log('Created department:', defaultDept.name);

  const permissions = [
    {
      id: 'perm-tenant',
      name: '租户管理',
      code: 'tenant',
      type: PermissionType.MENU,
      path: '/tenant',
      icon: 'building',
      sort: 1,
      children: [
        { id: 'perm-tenant-list', name: '租户列表', code: 'tenant:list', type: PermissionType.API, method: 'GET', path: '/api/tenants', sort: 1 },
        { id: 'perm-tenant-view', name: '查看租户', code: 'tenant:view', type: PermissionType.API, method: 'GET', path: '/api/tenants/:id', sort: 2 },
        { id: 'perm-tenant-create', name: '创建租户', code: 'tenant:create', type: PermissionType.API, method: 'POST', path: '/api/tenants', sort: 3 },
        { id: 'perm-tenant-update', name: '更新租户', code: 'tenant:update', type: PermissionType.API, method: 'PUT', path: '/api/tenants/:id', sort: 4 },
        { id: 'perm-tenant-delete', name: '删除租户', code: 'tenant:delete', type: PermissionType.API, method: 'DELETE', path: '/api/tenants/:id', sort: 5 },
        { id: 'perm-tenant-disable', name: '禁用租户', code: 'tenant:disable', type: PermissionType.API, method: 'POST', path: '/api/tenants/:id/disable', sort: 6 },
        { id: 'perm-tenant-enable', name: '启用租户', code: 'tenant:enable', type: PermissionType.API, method: 'POST', path: '/api/tenants/:id/enable', sort: 7 },
        { id: 'perm-tenant-config-view', name: '查看配置', code: 'tenant:config:view', type: PermissionType.API, method: 'GET', path: '/api/tenants/:id/config', sort: 8 },
        { id: 'perm-tenant-config-update', name: '更新配置', code: 'tenant:config:update', type: PermissionType.API, method: 'PUT', path: '/api/tenants/:id/config', sort: 9 },
      ],
    },
    {
      id: 'perm-user',
      name: '用户管理',
      code: 'user',
      type: PermissionType.MENU,
      path: '/user',
      icon: 'user',
      sort: 2,
      children: [
        { id: 'perm-user-list', name: '用户列表', code: 'user:list', type: PermissionType.API, method: 'GET', path: '/api/users', sort: 1 },
        { id: 'perm-user-view', name: '查看用户', code: 'user:view', type: PermissionType.API, method: 'GET', path: '/api/users/:id', sort: 2 },
        { id: 'perm-user-create', name: '创建用户', code: 'user:create', type: PermissionType.API, method: 'POST', path: '/api/users', sort: 3 },
        { id: 'perm-user-update', name: '更新用户', code: 'user:update', type: PermissionType.API, method: 'PUT', path: '/api/users/:id', sort: 4 },
        { id: 'perm-user-delete', name: '删除用户', code: 'user:delete', type: PermissionType.API, method: 'DELETE', path: '/api/users/:id', sort: 5 },
        { id: 'perm-user-reset-password', name: '重置密码', code: 'user:reset-password', type: PermissionType.API, method: 'POST', path: '/api/users/:id/reset-password', sort: 6 },
        { id: 'perm-user-invitation-create', name: '创建邀请码', code: 'user:invitation:create', type: PermissionType.API, method: 'POST', path: '/api/users/invitations', sort: 7 },
        { id: 'perm-user-invitation-list', name: '邀请码列表', code: 'user:invitation:list', type: PermissionType.API, method: 'GET', path: '/api/users/invitations/list', sort: 8 },
      ],
    },
    {
      id: 'perm-role',
      name: '角色管理',
      code: 'role',
      type: PermissionType.MENU,
      path: '/role',
      icon: 'role',
      sort: 3,
      children: [
        { id: 'perm-role-list', name: '角色列表', code: 'role:list', type: PermissionType.API, method: 'GET', path: '/api/roles', sort: 1 },
        { id: 'perm-role-view', name: '查看角色', code: 'role:view', type: PermissionType.API, method: 'GET', path: '/api/roles/:id', sort: 2 },
        { id: 'perm-role-create', name: '创建角色', code: 'role:create', type: PermissionType.API, method: 'POST', path: '/api/roles', sort: 3 },
        { id: 'perm-role-update', name: '更新角色', code: 'role:update', type: PermissionType.API, method: 'PUT', path: '/api/roles/:id', sort: 4 },
        { id: 'perm-role-delete', name: '删除角色', code: 'role:delete', type: PermissionType.API, method: 'DELETE', path: '/api/roles/:id', sort: 5 },
      ],
    },
    {
      id: 'perm-permission',
      name: '权限管理',
      code: 'permission',
      type: PermissionType.MENU,
      path: '/permission',
      icon: 'permission',
      sort: 4,
      children: [
        { id: 'perm-permission-list', name: '权限列表', code: 'permission:list', type: PermissionType.API, method: 'GET', path: '/api/permissions', sort: 1 },
        { id: 'perm-permission-view', name: '查看权限', code: 'permission:view', type: PermissionType.API, method: 'GET', path: '/api/permissions/:id', sort: 2 },
        { id: 'perm-permission-create', name: '创建权限', code: 'permission:create', type: PermissionType.API, method: 'POST', path: '/api/permissions', sort: 3 },
        { id: 'perm-permission-update', name: '更新权限', code: 'permission:update', type: PermissionType.API, method: 'PUT', path: '/api/permissions/:id', sort: 4 },
        { id: 'perm-permission-delete', name: '删除权限', code: 'permission:delete', type: PermissionType.API, method: 'DELETE', path: '/api/permissions/:id', sort: 5 },
      ],
    },
    {
      id: 'perm-department',
      name: '部门管理',
      code: 'department',
      type: PermissionType.MENU,
      path: '/department',
      icon: 'department',
      sort: 5,
      children: [
        { id: 'perm-dept-list', name: '部门列表', code: 'department:list', type: PermissionType.API, method: 'GET', path: '/api/departments', sort: 1 },
        { id: 'perm-dept-view', name: '查看部门', code: 'department:view', type: PermissionType.API, method: 'GET', path: '/api/departments/:id', sort: 2 },
        { id: 'perm-dept-create', name: '创建部门', code: 'department:create', type: PermissionType.API, method: 'POST', path: '/api/departments', sort: 3 },
        { id: 'perm-dept-update', name: '更新部门', code: 'department:update', type: PermissionType.API, method: 'PUT', path: '/api/departments/:id', sort: 4 },
        { id: 'perm-dept-delete', name: '删除部门', code: 'department:delete', type: PermissionType.API, method: 'DELETE', path: '/api/departments/:id', sort: 5 },
        { id: 'perm-dept-move', name: '移动部门', code: 'department:move', type: PermissionType.API, method: 'POST', path: '/api/departments/:id/move', sort: 6 },
      ],
    },
    {
      id: 'perm-operation-log',
      name: '操作日志',
      code: 'operation-log',
      type: PermissionType.MENU,
      path: '/operation-log',
      icon: 'log',
      sort: 6,
      children: [
        { id: 'perm-log-list', name: '日志列表', code: 'operation-log:list', type: PermissionType.API, method: 'GET', path: '/api/operation-logs', sort: 1 },
        { id: 'perm-log-view', name: '查看日志', code: 'operation-log:view', type: PermissionType.API, method: 'GET', path: '/api/operation-logs/:id', sort: 2 },
        { id: 'perm-log-delete', name: '清空日志', code: 'operation-log:delete', type: PermissionType.API, method: 'DELETE', path: '/api/operation-logs', sort: 3 },
      ],
    },
  ];

  const allPermissionIds: string[] = [];

  for (const perm of permissions) {
    allPermissionIds.push(perm.id);
    if (perm.children) {
      for (const child of perm.children) {
        allPermissionIds.push(child.id);
      }
    }
  }

  const existingPermissions = await prisma.permission.findMany({
    where: { id: { in: allPermissionIds } },
    select: { id: true },
  });

  const existingPermissionIds = new Set(existingPermissions.map((p) => p.id));

  for (const perm of permissions) {
    if (!existingPermissionIds.has(perm.id)) {
      await prisma.permission.create({
        data: {
          id: perm.id,
          name: perm.name,
          code: perm.code,
          type: perm.type,
          path: perm.path,
          icon: perm.icon,
          sort: perm.sort,
          tenantId: defaultTenant.id,
        },
      });
      console.log('Created permission:', perm.code);
    }

    if (perm.children) {
      for (const child of perm.children) {
        if (!existingPermissionIds.has(child.id)) {
          await prisma.permission.create({
            data: {
              id: child.id,
              name: child.name,
              code: child.code,
              type: child.type,
              path: child.path,
              method: child.method,
              sort: child.sort,
              parentId: perm.id,
              tenantId: defaultTenant.id,
            },
          });
          console.log('Created permission:', child.code);
        }
      }
    }
  }

  const adminRole = await prisma.role.upsert({
    where: { id: 'role-admin' },
    update: {},
    create: {
      id: 'role-admin',
      name: '超级管理员',
      code: 'super_admin',
      tenantId: defaultTenant.id,
      parentId: null,
      dataScope: DataScope.ALL,
      sort: 1,
      description: '系统超级管理员角色，拥有所有权限',
      isEnabled: true,
    },
  });

  console.log('Created role:', adminRole.code);

  const existingRolePerms = await prisma.rolePermission.findMany({
    where: { roleId: adminRole.id },
    select: { permissionId: true },
  });

  const existingRolePermIds = new Set(existingRolePerms.map((rp) => rp.permissionId));

  for (const permId of allPermissionIds) {
    if (!existingRolePermIds.has(permId)) {
      await prisma.rolePermission.create({
        data: {
          roleId: adminRole.id,
          permissionId: permId,
        },
      });
      console.log('Assigned permission to role:', permId);
    }
  }

  const existingAdmin = await prisma.user.findUnique({
    where: {
      username_tenantId: {
        username: 'admin',
        tenantId: defaultTenant.id,
      },
    },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const adminUser = await prisma.user.create({
      data: {
        id: 'user-admin',
        username: 'admin',
        password: hashedPassword,
        email: 'admin@example.com',
        tenantId: defaultTenant.id,
        departmentId: defaultDept.id,
        isEnabled: true,
      },
    });

    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    });

    console.log('Created admin user: admin / admin123');
  } else {
    console.log('Admin user already exists');
  }

  console.log('Seeding completed!');
  console.log('========================================');
  console.log('Default credentials:');
  console.log('  Username: admin');
  console.log('  Password: admin123');
  console.log('  Tenant Code: default');
  console.log('========================================');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
