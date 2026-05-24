export default function access(initialState: any) {
  const permissionCodes = initialState?.permissionCodes || [];

  return {
    hasPerm: (code: string) => permissionCodes.includes(code),
  };
}
