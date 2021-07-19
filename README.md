# EventsStorage
Example of asp .net 5.0 mvc web application that uses Razor pages with Material Design web components.

These are generic installation instructions.

Edit database connection string in file appsettings.json;

Download and install ASP.NET Core SDK 5.0;

In the solution's folder execute following commands:

* dotnet restore
* dotnet tool install --global dotnet-ef
* dotnet ef migrations add Initial
* dotnet ef database update
* dotnet build
* dotnet run

Application is running now on a local web-server with url https://localhost:5001

To deploy application on IIS execute command:

* dotnet publish --configuration Release

Move files from /bin/Release/net5.0/publish to IIS folder.