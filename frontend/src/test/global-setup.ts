// Run every test as if the browser were in India (UTC+5:30), so anything rendered in the viewer's local time fails loudly.
export default function setup() {
  process.env.TZ = 'Asia/Kolkata'
}
