export default function EmptyStatePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#F0F2F5] dark:bg-[#222E35]">
      <div className="text-center p-8 max-w-md">
        <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg viewBox="0 0 24 24" fill="white" className="w-14 h-14">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
          </svg>
        </div>
        <h2 className="text-3xl font-light text-gray-700 dark:text-gray-300 mb-4">Signal Clone</h2>
        <p className="text-gray-500 dark:text-gray-400">
          Send and receive messages without keeping your phone online.
          <br/>
          Select a chat to start messaging.
        </p>
      </div>
    </div>
  );
}
