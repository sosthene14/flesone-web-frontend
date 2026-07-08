import { BusRoute } from "../types/types"

export const routes: BusRoute[] = [
  {
    id: "route-7",
    lineName: "Ligne 7 · Parcelles → École",
    path: [
      [-17.4677, 14.7167],
      [-17.4599, 14.7245],
      [-17.4488, 14.7286],
      [-17.4345, 14.7401],
      [-17.4230, 14.7469],
    ],
    stops: [
      { id: "s1", name: "Parcelles Assainies", coord: [-17.4677, 14.7167] },
      { id: "s2", name: "Liberté 6", coord: [-17.4488, 14.7286] },
      { id: "s3", name: "HLM", coord: [-17.4345, 14.7401] },
      { id: "s4", name: "École", coord: [-17.4230, 14.7469] },
    ],
  },
  {
    id: "route-3",
    lineName: "Ligne 3 · Grand Yoff → Plateau",
    path: [
      [-17.4740, 14.7350],
      [-17.4680, 14.7230],
      [-17.4590, 14.7050],
      [-17.4450, 14.6950],
      [-17.4380, 14.6720],
    ],
    stops: [
      { id: "s5", name: "Grand Yoff", coord: [-17.4740, 14.7350] },
      { id: "s6", name: "Sacré-Cœur", coord: [-17.4590, 14.7050] },
      { id: "s7", name: "Point E", coord: [-17.4450, 14.6950] },
      { id: "s8", name: "Plateau", coord: [-17.4380, 14.6720] },
    ],
  },
  {
    id: "route-12",
    lineName: "Ligne 12 · Ouakam → Ngor",
    path: [
      [-17.4900, 14.7180],
      [-17.4980, 14.7350],
      [-17.5050, 14.7480],
      [-17.5120, 14.7550],
    ],
    stops: [
      { id: "s9", name: "Ouakam", coord: [-17.4900, 14.7180] },
      { id: "s10", name: "Mermoz", coord: [-17.4980, 14.7350] },
      { id: "s11", name: "Almadies", coord: [-17.5050, 14.7480] },
      { id: "s12", name: "Ngor", coord: [-17.5120, 14.7550] },
    ],
  },
]
