const data = {
  skills: [
    {
      "name": "HTML",
      "value": 100
    },
    {
      "name": "CSS",
      "value": 90
    },
    {
      "name": "JavaScript",
      "value": 75
    },
    {
      "name": "PHP",
      "value": 80
    },
    {
      "name": "MySQL",
      "value": 90
    },
    {
      "name": "Laravel",
      "value": 80
    },
    {
      "name": "Git",
      "value": 80
    },
    {
      "name": "Docker",
      "value": 80
    }
  ]
}

//containers
const skillsContainer = document.querySelector('.skills-animation');


// render
skills = data.skills;
skills.forEach(skill => {
  const skillItem = document.createElement('div');
  skillItem.classList.add('col-md-6');
  skillItem.innerHTML = `<div class="progress">
    <span class="skill">${skill.name} <i class="val">${skill.value}%</i></span>
    <div class="progress-bar-wrap">
      <div class="progress-bar" role="progressbar" aria-valuenow="${skill.value}" aria-valuemin="0" aria-valuemax="100"></div>
    </div>
    </div>
  `;
  skillsContainer.appendChild(skillItem);
});