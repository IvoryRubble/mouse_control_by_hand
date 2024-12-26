const sliderContainers = document.getElementsByClassName("slidecontainer");
    for (const sliderContainer of sliderContainers) {
        const slider = sliderContainer.querySelector("input");
        const label = sliderContainer.querySelector("* > span");
        label.innerHTML = slider.value;
        slider.oninput = function () {
            label.innerHTML = this.value;
        }
    }