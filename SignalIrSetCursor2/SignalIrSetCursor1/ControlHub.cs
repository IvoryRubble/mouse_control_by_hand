using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading.Tasks;

namespace SignalIrSetCursor1
{
    public class ControlHub : Hub
    {
        [DllImport("user32.dll")]
        static extern bool SetCursorPos(int X, int Y);

        public ControlHub()
        {
        }

        public Task SetCursor(string x, string y)
        {
            // await this.Clients.All.SendAsync("Receive", x, y);
            Console.WriteLine($"X: {x} Y: {y}");
            double xDouble = Convert.ToDouble(x, CultureInfo.InvariantCulture);
            double yDouble = Convert.ToDouble(y, CultureInfo.InvariantCulture);
            int xInt = (int)Math.Round(xDouble);
            int yInt = (int)Math.Round(yDouble);

            SetCursorPos(xInt, yInt);

            return Task.CompletedTask;
        }
    }
}
