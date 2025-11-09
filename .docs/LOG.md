- var links = [{n: 'Twitter', h: 'https://twitter.com/abh1nash', i: 'fab fa-twitter'},{n: 'Codepen', h: 'https://codepen.io/abh1nash', i: 'fab fa-codepen'},{n: 'Website', h: 'https://abhinash.net', i: 'fas fa-globe'}, ]
.main-container
  .btn-container
    .expandable-button
      .fill-block
      .close-icon
        .fas.fa-times
      each link in links
        a.expansion-item(href=link.h)
          .expansion-content
            .icon(class=link.i)
            .text #{link.n}



$primary: #fee715;
$secondary: #101820;

$primary100: #fee71522;
$secondary100: #10182022;

$primary200: #fee71544;
$secondary200: #10182044;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  overflow: hidden;
  font-family: "Roboto Condensed", sans-serif;
}

.main-container {
  height: 100vh;
  background: $primary;
  display: flex;
  align-items: center;
  justify-content: center;
}

.expandable-button {
  position: relative;
  width: 8em;
  height: 8em;
  border: 1px solid $secondary;
  border-radius: 50%;
  background: $secondary;
  transition: 0.15s ease-out;
  cursor: pointer;
  box-shadow: 0 10px 50px 5px $secondary100;

  .fill-block {
    position: absolute;
    height: 100%;
    width: 100%;
    z-index: 1;
  }

  .close-icon {
    position: relative;
    height: 100%;
    width: 100%;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    font-size: 2em;
    .fas {
      position: absolute;
      top: 100%;
      transition: 0.15s;
    }
  }

  &:hover {
    box-shadow: 0 15px 100px 10px $secondary100;
  }

  .expansion-item {
    position: absolute;
    top: 50%;
    left: 50%;
    height: 1em;
    width: 1em;
    background: #fff;
    border-radius: 50%;
    pointer-events: none;
    text-decoration: none;
    color: $secondary;
    transition: 0.25s;
    box-shadow: 0 5px 80px 5px $secondary200;

    .expansion-content {
      display: none;
      transition: 0.15s;
      animation: fadeOut 0.5s linear forwards;
    }
  }

  @for $i from 0 through 2 {
    .expansion-item:nth-of-type(#{$i + 1}) {
      transform: translateX(calc(#{($i * 3) - 60%} + #{($i - 1) * 25px}))
        translateY(-50%);
    }
  }

  &.expanded {
    width: 5em;
    height: 5em;

    &:hover {
      box-shadow: 0 10px 50px 5px $secondary100;
    }

    .close-icon {
      .fas {
        top: 50%;
        transform: translateY(-50%);
        transition-delay: 0.25s;
      }
    }

    .expansion-item {
      width: 7em;
      height: 2em;
      border-radius: 5em;
      top: -50%;
      pointer-events: fill;
      transform: translateX(-0.7em);

      &:hover {
        top: -60%;
      }

      .expansion-content {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        line-height: 1;
        text-transform: uppercase;
        opacity: 0;
        animation: fadeIn 0.25s linear forwards;
      }
    }

    @for $i from 0 through 2 {
      .expansion-item:nth-of-type(#{$i + 1}) {
        left: calc(#{($i - 1) * 7.5em} - #{($i - 1) * 5}%);
        transition-delay: #{($i + 1) * 0.05}s;

        .expansion-content {
          animation-delay: #{($i + 1) * 0.1}s;
        }
      }
    }
  }
}

@keyframes fadeIn {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@keyframes fadeOut {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}


const select = (s) => document.querySelector(s);

const btn = select(".expandable-button");

btn.addEventListener("click", () => {
  btn.classList.toggle("expanded");
});

