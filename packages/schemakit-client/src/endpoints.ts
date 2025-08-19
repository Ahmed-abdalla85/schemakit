export function entityBasePath(entityName: string): string {
  return `/entity/${entityName}`;
}

export function entityListPath(entityName: string): string {
  return entityBasePath(entityName);
}

export function entityByIdPath(entityName: string, id: string | number): string {
  return `${entityBasePath(entityName)}/${encodeURIComponent(String(id))}`;
}

export function entityViewPath(entityName: string, viewName: string): string {
  return `${entityBasePath(entityName)}/views/${encodeURIComponent(viewName)}`;
}
