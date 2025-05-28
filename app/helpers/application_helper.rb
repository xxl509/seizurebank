module ApplicationHelper
	def bootstrap_class_for flash_type
    alert_mappings = { "success" => "alert-success", 
      "error" => "alert-danger", 
      "alert" => "alert-warning", 
      "notice" => "alert-success" 
    }
              
    alert_mappings[flash_type] || flash_type.to_s
  end

  def compress(path)
    path.sub!(%r[/$],'')
    archive = File.join(path,File.basename(path))+'.zip'
    FileUtils.rm archive, :force=>true

    Zip::File.open(archive, 'w') do |zipfile|
      Dir["#{path}/**/**"].reject{|f|f==archive}.each do |file|
        zipfile.add(file.sub(path+'/',''),file)
      end
    end
  end

  
end
