/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {
      fontFamily:{
          barlow:['"Barlow Condensed"','sans-serif']
      },
    
     colors:{
      primary:'#16405B'
    }
    
    },
   
  },
  plugins: [],
}

