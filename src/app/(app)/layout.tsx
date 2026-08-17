export default function AppLayout({ children }: LayoutProps<"/">) {
  return <main className="flex-1 p-6">{children}</main>;
}
