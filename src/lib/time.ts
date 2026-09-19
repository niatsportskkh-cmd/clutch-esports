// India has no DST, so IST is a fixed +05:30
export const istToUtc = (local: string) => new Date(`${local}:00+05:30`)
export const utcToIstInput = (d: Date) => new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 16)

const fmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
})
export const formatIst = (d: Date) => `${fmt.format(d)} IST`
