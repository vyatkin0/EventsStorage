using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using System;

namespace EventsStorage
{
    public class Program
    {
        public static void Main(string[] args)
        {
            CreateHostBuilder(args).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    string port = Environment.GetEnvironmentVariable("PORT") ?? "8080";

                    webBuilder
                        .UseUrls($"http://0.0.0.0:{port}")
                        .UseStartup<Startup>();
                });
    }
}
