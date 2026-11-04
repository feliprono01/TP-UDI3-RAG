// Parte un arreglo en grupos de `tamano` elementos: [1,2,3,4,5] -> [[1,2],[3,4],[5]]
export function enLotes(arreglo, tamano) {
  const lotes = [];
  for (let i = 0; i < arreglo.length; i += tamano) {
    lotes.push(arreglo.slice(i, i + tamano));
  }
  return lotes;
}
