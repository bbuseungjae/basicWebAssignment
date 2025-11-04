let zIndex = 3;
let pos1 = 0,
    pos2 = 0;

function dragplant(event)
{
    event.dataTransfer.setData("plant", event.target.id);
}

document.addEventListener("dragover", function (event)
{
    event.preventDefault();
});

document.addEventListener("drop", function (event)
{
    event.preventDefault();
    let draggedplantData = event.dataTransfer.getData("plant");
    let draggedplantElement = document.getElementById(draggedplantData);

    let pos1 = event.clientX;
    let pos2 = event.clientY;

    draggedplantElement.style.left = pos1 - draggedplantElement.offsetWidth / 2 + "px";
    draggedplantElement.style.top = pos2 - draggedplantElement.offsetHeight / 2 + "px";

    document.getElementById('terrarium').appendChild(draggedplantElement);
});

document.querySelectorAll('.plant').forEach(plant =>
{
    plant.addEventListener("dblclick", function (event)
    {
        plant.style.zIndex = zIndex++;
    })
});