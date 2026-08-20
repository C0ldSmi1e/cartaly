import { notFound } from "next/navigation";
import { getMenu } from "@/src/server/actions/get-menu";
import { NotFoundError } from "@/src/server/errors";
import { MenuScreen } from "@/src/components/menu/menu-screen";
import type { MenuView } from "@/src/schemas/menu";

const ID_RE = /^[0-9A-Za-z]{8,20}$/;

export default async function MenuPage(props: PageProps<"/m/[id]">) {
  const { id } = await props.params;
  if (!ID_RE.test(id)) {
    notFound();
  }

  let menu: MenuView;
  try {
    ({ menu } = getMenu({ menuId: id }));
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  return <MenuScreen menuId={id} initialDishes={menu.dishes} />;
}
