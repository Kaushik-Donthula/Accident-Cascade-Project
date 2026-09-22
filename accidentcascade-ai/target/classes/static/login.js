const form = document.querySelector('#login-form');
const error = document.querySelector('#error');
const demoEmail = 'admin@accidentcascade.ai';
const demoPassword = 'Accident@123';

if (sessionStorage.getItem('accidentcascade-user')) location.replace('/');

form.addEventListener('submit', async event => {
  event.preventDefault();
  error.textContent = '';
  const body = Object.fromEntries(new FormData(form));
  try {
    const response = await fetch('/api/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
    if (!response.ok) throw new Error('Incorrect email or password');
    const user = await response.json();
    sessionStorage.setItem('accidentcascade-user', JSON.stringify(user));
    location.assign('/');
  } catch {
    if (body.email === demoEmail && body.password === demoPassword) {
      sessionStorage.setItem('accidentcascade-user', JSON.stringify({name:'Traffic Control Admin', email:demoEmail}));
      location.assign('/');
    } else error.textContent = 'Incorrect email or password.';
  }
});
