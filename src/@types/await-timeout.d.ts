declare module "await-timeout" {
  interface Timeout {
    wrap<T>(
      promise: Promise<T>,
      timeout: number,
      rejectResponse?: boolean | string,
    ): Promise<T>
  }
  const Timeout: Timeout
  export default Timeout
}
