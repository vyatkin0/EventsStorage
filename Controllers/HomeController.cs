using System;
using System.Diagnostics;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using EventsStorage.Models;
using EventsStorage.Infrastructure;
using Microsoft.EntityFrameworkCore;
using System.IO;
using System.ComponentModel.DataAnnotations;
using System.Web;

namespace EventsStorage.Controllers
{
    public class HomeController : Controller
    {
        private readonly EventDbContext _ctx;
        private readonly ILogger<HomeController> _logger;

        public HomeController(ILogger<HomeController> logger, EventDbContext ctx)
        {
            _logger = logger;
             _ctx = ctx;
        }

        [Route("{controller}")]
        public IActionResult Index([FromForm]int? offset, [FromForm]int? count, [FromForm] string subjects)
        {
            if (!offset.HasValue)
            {
                offset = 0;
            }

            if (!count.HasValue)
            {
                count = 10;
            }

            int[] ids = Array.Empty<int>();

            if (!string.IsNullOrWhiteSpace(subjects))
            {
                string[] strIds = subjects.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                ids = Array.ConvertAll(strIds, s => { _ = int.TryParse(s, out int result); return result; });
            }

            EventSubject[] eventSubjects = _ctx.Subjects
                    .Where(c => ids.Contains(c.Id))
                    .ToArray();

            foreach (EventSubject es in eventSubjects)
            {
                if (es.Name.Length > 10)
                {
                    es.Name = es.Name.Substring(0, 7) + "...";
                }
            }

            AppEvent[] events = _ctx.Events
                .Include(e=>e.Files)
                .Include(e=>e.Subject)
                .Where(e=> ids.Length<1 || ids.Contains(e.SubjectId))
                .OrderByDescending(e=>e.Id)
                .Skip(offset.Value)
                .Take(count.Value)
                .AsNoTracking()
                .ToArray();

            return View(new EventListViewModel
            {
                events = events,
                subjects = eventSubjects,
                offset = offset.Value,
                count = count.Value,
                total = _ctx.Events.Count()
            });
        }

        [HttpPost("[controller]/[action]")]
        public IActionResult UploadFile(UploadEventFileViewModel model)
        {
            if (!ModelState.IsValid)
            {
                var messages = string.Join("; ", ModelState.Values
                    .SelectMany(x => x.Errors)
                    .Select(x => x.ErrorMessage));

                return BadRequest(messages);
            }

            EventFile file = new EventFile
            {
                EventId = model.eventId,
                Name = model.formFile.FileName,
                Type = model.fileType,
                CreatedAt = DateTime.UtcNow
            };

            // Upload the file if less than 10 MB
            if (model.formFile.Length > 10 * 1024 * 1024)
            {
                return BadRequest("File size is greater than 10 Mb");
            }

            using (var memoryStream = new MemoryStream())
            {
                model.formFile.CopyTo(memoryStream);

                file.ContentType = model.formFile.ContentType;
                file.Content = memoryStream.ToArray();
            }

            _ctx.Add(file);
            _ctx.SaveChanges();

            return Ok(file);
        }

        [HttpGet("[controller]/[action]")]
        public IActionResult Download([Required]long id)
        {
            if (!ModelState.IsValid)
            {
                var messages = string.Join("; ", ModelState.Values
                    .SelectMany(x => x.Errors)
                    .Select(x => x.ErrorMessage));

                return BadRequest(messages);
            }

            EventFile file = _ctx.Files.SingleOrDefault(f=>f.Id==id);
            if (null == file)
            {
                return BadRequest("File not found");
            }

            string contentType = file.ContentType ?? System.Net.Mime.MediaTypeNames.Application.Octet;

            return File(file.Content, contentType, file.Name);
        }

        [HttpPost("[controller]/[action]")]
        public IActionResult EventSubjects(string search, int[] exclude)
        {
            if (string.IsNullOrWhiteSpace(search))
            {
                return Ok(Array.Empty<object>());
            }

            bool sortById = false;
            IQueryable<EventSubject> query = null;
            if (ulong.TryParse(search, out ulong value))
            {
                sortById = true;
                query = _ctx.Subjects.Where(s => s.Name.Contains(search) || s.Id.ToString().Contains(search));
            }
            else
            {
                query = _ctx.Subjects.Where(s => s.Name.Contains(search));
            }

            var result = query
                .Where(s=>!exclude.Contains(s.Id))
                .Take(10)
                .AsNoTracking()
                .AsEnumerable();

            //Using client sort for 10 randomly received items to speedup sql query execution
            if (sortById)
            {
                result = result.OrderBy(s => s.Id).ThenBy(s => s.Name);
            }
            else
            {
                result = result.OrderBy(s => s.Name);
            }

            return Ok(result.Select(s => new { s.Id, name = HttpUtility.HtmlEncode(s.Name) }));
        }

        [HttpPost("[controller]/[action]")]
        public IActionResult Delete([Required] long id)
        {
            if (!ModelState.IsValid)
            {
                var messages = string.Join("; ", ModelState.Values
                    .SelectMany(x => x.Errors)
                    .Select(x => x.ErrorMessage));

                return BadRequest(messages);
            }

            EventFile file = _ctx.Files.SingleOrDefault(f => f.Id == id);
            if (null == file)
            {
                return BadRequest("File not found");
            }

            _ctx.Files.Remove(file);
            _ctx.SaveChanges();

            return Ok(file);
        }
        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
